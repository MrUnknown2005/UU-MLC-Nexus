-- ============================================================================
-- 20260918000000_dedupe_direct_conversations.sql
-- One canonical direct thread per pair — dedupe what exists, prevent recurrence.
-- ----------------------------------------------------------------------------
-- Bug: start_direct_conversation() matched an existing DM only when BOTH people
-- still had participant rows. Leaving a DM deletes your row, so re-messaging
-- someone you'd left missed the old thread and forked a fresh one — a pair could
-- pile up parallel threads, and "message them again" opened a blank chat instead
-- of the history.
--
-- Fix, in one inert / idempotent pass (safe to paste into the SQL editor; safe
-- to re-run — every step is guarded):
--   1. Add conversations.direct_key — a canonical, order-independent id for the
--      pair ('<lesser_uuid>:<greater_uuid>'); null for group threads.
--   2. Collapse any pair that already has more than one thread into a single
--      survivor, relocating messages / reports / grants / participants BEFORE
--      dropping the empty duplicates (every child FK is ON DELETE CASCADE, so
--      the moves must lead or the history would be cascaded away).
--   3. Backfill direct_key on every surviving direct thread whose pair can be
--      reconstructed (current participants + creator + everyone who ever sent).
--   4. Unique partial index: at most one direct thread per pair, forever.
--   5. Rewrite start_direct_conversation() to find-by-key and re-add whichever
--      party is missing — reopening the old thread (history and all) instead of
--      forking. It creates a thread only when the pair has never had one.
-- ============================================================================

-- 1 · Canonical pair key ------------------------------------------------------
alter table public.conversations
  add column if not exists direct_key text;

comment on column public.conversations.direct_key is
  'kind=direct: canonical <lesser_uuid>:<greater_uuid> of the pair, so a pair '
  'keeps exactly one thread even after someone leaves. Null for group threads.';

-- 2 & 3 · Dedupe existing threads, then backfill the key ----------------------
do $$
declare
  rec         record;
  survivor    uuid;
  loser       uuid;
  has_reports boolean := to_regclass('public.conversation_reports') is not null;
  has_grants  boolean := to_regclass('public.breakglass_grants')    is not null;
begin
  -- Reconstruct each direct thread's pair. A sender or the creator was always a
  -- participant at some point, so for a well-formed DM this union is exactly the
  -- two members — recoverable even when the live participant rows are gone.
  create temporary table _dc on commit drop as
  with members as (
    select
      c.id as conversation_id,
      (select array_agg(distinct m) from (
         select p.member_id as m
           from public.conversation_participants p
          where p.conversation_id = c.id
         union select c.created_by
         union select msg.sender_id
           from public.messages msg
          where msg.conversation_id = c.id
       ) s where m is not null) as ids
    from public.conversations c
    where c.kind = 'direct'
  )
  select
    conversation_id,
    case when array_length(ids, 1) = 2
         then least(ids[1], ids[2])::text || ':' || greatest(ids[1], ids[2])::text
         else null end as pair_key
  from members;

  -- Collapse pairs that already have more than one thread.
  for rec in
    select pair_key, array_agg(conversation_id) as conv_ids
    from _dc
    where pair_key is not null
    group by pair_key
    having count(*) > 1
  loop
    -- Survivor: the most reachable thread (most current participants), then the
    -- most recently active, then the oldest — fully deterministic.
    select d.cid into survivor
    from unnest(rec.conv_ids) as d(cid)
    join public.conversations c on c.id = d.cid
    order by
      (select count(*) from public.conversation_participants p where p.conversation_id = c.id) desc,
      c.last_message_at desc,
      c.created_at asc,
      c.id asc
    limit 1;

    for loser in select unnest(rec.conv_ids) except select survivor loop
      -- Relocate everything that would otherwise cascade away with the loser.
      update public.messages
        set conversation_id = survivor where conversation_id = loser;
      if has_reports then
        update public.conversation_reports
          set conversation_id = survivor where conversation_id = loser;
      end if;
      if has_grants then
        update public.breakglass_grants
          set conversation_id = survivor where conversation_id = loser;
      end if;
      insert into public.conversation_participants
        (conversation_id, member_id, added_by, added_at, last_read_at)
        select survivor, p.member_id, p.added_by, p.added_at, p.last_read_at
        from public.conversation_participants p
        where p.conversation_id = loser
        on conflict (conversation_id, member_id) do nothing;
      delete from public.conversations where id = loser;
    end loop;

    -- The survivor absorbed history from both sides; keep its stamp truthful.
    update public.conversations c
      set last_message_at = greatest(
            c.last_message_at,
            coalesce((select max(m.created_at) from public.messages m
                       where m.conversation_id = c.id), c.last_message_at))
      where c.id = survivor;
  end loop;

  -- Backfill the key on every surviving direct thread (deleted losers no longer
  -- join, so they are simply skipped).
  update public.conversations c
    set direct_key = d.pair_key
  from _dc d
  where c.id = d.conversation_id
    and d.pair_key is not null
    and c.direct_key is distinct from d.pair_key;
end $$;

-- 4 · One direct thread per pair, enforced -----------------------------------
create unique index if not exists idx_conversations_direct_unique
  on public.conversations (direct_key)
  where kind = 'direct' and direct_key is not null;

-- 5 · Reopen instead of fork --------------------------------------------------
create or replace function public.start_direct_conversation(target uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller         uuid := auth.uid();
  target_privacy text;
  target_active  boolean;
  target_role    text;
  pair_key       text;
  existing_id    uuid;
  new_id         uuid;
begin
  if caller is null then
    raise exception 'Not authenticated';
  end if;
  if target is null or target = caller then
    raise exception 'Invalid conversation target';
  end if;

  select dm_privacy, is_active, role
    into target_privacy, target_active, target_role
  from public.profiles
  where id = target;

  if not found then
    raise exception 'Member not found';
  end if;
  if coalesce(target_active, true) = false or target_role = 'guest' then
    raise exception 'This member cannot receive messages';
  end if;

  -- A block in either direction closes the channel.
  if exists (
    select 1 from public.messaging_blocks
    where (blocker_id = target and blocked_id = caller)
       or (blocker_id = caller and blocked_id = target)
  ) then
    raise exception 'Messaging is blocked between these members';
  end if;

  -- The target's privacy preference.
  if target_privacy = 'none' then
    raise exception 'This member is not accepting new messages';
  elsif target_privacy = 'groups' then
    if not exists (
      select 1
      from public.group_members gm_self
      join public.group_members gm_target
        on gm_self.group_id = gm_target.group_id
      where gm_self.member_id = caller
        and gm_target.member_id = target
    ) then
      raise exception 'This member only accepts messages from group-mates';
    end if;
  end if;

  -- Canonical, order-independent key for this pair. It finds the one existing
  -- thread even if either side had left it (their participant row was deleted).
  pair_key := least(caller, target)::text || ':' || greatest(caller, target)::text;

  select c.id into existing_id
  from public.conversations c
  where c.kind = 'direct' and c.direct_key = pair_key
  limit 1;

  if existing_id is not null then
    -- Reopen: put BOTH parties back so the old history reappears for whoever had
    -- left. Blocks / privacy were already cleared above; re-adding the target is
    -- exactly what opening a DM does in the first place.
    insert into public.conversation_participants (conversation_id, member_id, added_by)
    values (existing_id, caller, caller), (existing_id, target, caller)
    on conflict (conversation_id, member_id) do nothing;
    return existing_id;
  end if;

  -- The pair has never had a thread: create the canonical one.
  begin
    insert into public.conversations (kind, created_by, direct_key)
    values ('direct', caller, pair_key)
    returning id into new_id;
  exception when unique_violation then
    -- A concurrent caller created it a moment ago; use that one.
    select c.id into new_id
    from public.conversations c
    where c.kind = 'direct' and c.direct_key = pair_key
    limit 1;
  end;

  insert into public.conversation_participants (conversation_id, member_id, added_by)
  values (new_id, caller, caller), (new_id, target, caller)
  on conflict (conversation_id, member_id) do nothing;

  return new_id;
end;
$$;

grant execute on function public.start_direct_conversation(uuid) to authenticated;
