-- ============================================================================
-- 20260916000000_messaging.sql
--
-- In-app Messaging ("Messages") — private, members-only conversations so people
-- can talk about club matters without swapping outside contact details.
--
-- CONTEXT
--   Members need a private in-app channel. `profiles` holds no phone / email /
--   address / DOB, so a chat member list cannot leak contact info — there is
--   none. This migration adds:
--     1. conversations              — a direct (1:1) or group thread.
--     2. conversation_participants  — who is in each thread + their read cursor.
--     3. messages                   — the message rows (soft-deletable by sender).
--     4. messaging_blocks           — per-member block list.
--     5. profiles.dm_privacy        — who may open a new DM with a member.
--
--   Privacy is enforced by Row Level Security, NOT end-to-end encryption: only
--   participants can read a conversation THROUGH THE APP. This is a strong,
--   fully-auditable control, but whoever holds the raw database keys can read
--   rows — exactly as is already true for points, news and notifications. No
--   admin read path exists in this migration; a hidden, audited break-glass is
--   added later (20260916100000_messaging_breakglass.sql).
--
--   DM privacy is open by default (anyone may message anyone) with a per-member
--   opt-out: dm_privacy = 'everyone' | 'groups' (group-mates only) | 'none'.
--   Group chats are both auto (one room per admin Group) and ad-hoc.
--
--   Adding OTHER people to a conversation, and every privacy check, happens only
--   inside the SECURITY DEFINER RPCs below — the RLS write policies let a member
--   touch only their own participation row, so nobody can add themselves to a
--   thread they were not invited to.
--
-- IDEMPOTENT
--   Safe to run more than once: add-column IF NOT EXISTS, guarded constraints,
--   create-or-replace functions, create table IF NOT EXISTS, drop-policy-before-
--   create, drop-trigger-before-create, and a guarded realtime publication loop.
--
-- APPLY
--   Run on the next Supabase reconnect, alongside any other pending migration.
--   Until it is applied, Messages.jsx degrades gracefully to a "not set up yet"
--   empty state (the isSchemaMissingError pattern the Groups feature uses).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1 · profiles.dm_privacy — who may open a new direct conversation with a member.
-- ----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists dm_privacy text not null default 'everyone';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_dm_privacy_check'
  ) then
    alter table public.profiles
      add constraint profiles_dm_privacy_check
      check (dm_privacy in ('everyone', 'groups', 'none'));
  end if;
end$$;

-- ----------------------------------------------------------------------------
-- 2 · Tables.
-- ----------------------------------------------------------------------------
create table if not exists public.conversations (
  id              uuid        not null default gen_random_uuid(),
  kind            text        not null default 'direct',
  title           text,
  group_id        uuid,
  created_by      uuid,
  created_at      timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  constraint conversations_pkey primary key (id),
  constraint conversations_group_id_fkey foreign key (group_id)
    references public.groups(id) on delete set null,
  constraint conversations_created_by_fkey foreign key (created_by)
    references public.profiles(id) on delete set null,
  constraint conversations_kind_check check (kind in ('direct', 'group')),
  constraint conversations_title_len check (title is null or char_length(title) <= 120)
);

create table if not exists public.conversation_participants (
  conversation_id uuid        not null,
  member_id       uuid        not null,
  added_by        uuid,
  added_at        timestamptz not null default now(),
  last_read_at    timestamptz not null default now(),
  constraint conversation_participants_pkey primary key (conversation_id, member_id),
  constraint conversation_participants_conversation_id_fkey foreign key (conversation_id)
    references public.conversations(id) on delete cascade,
  constraint conversation_participants_member_id_fkey foreign key (member_id)
    references public.profiles(id) on delete cascade,
  constraint conversation_participants_added_by_fkey foreign key (added_by)
    references public.profiles(id) on delete set null
);

create table if not exists public.messages (
  id              uuid        not null default gen_random_uuid(),
  conversation_id uuid        not null,
  sender_id       uuid,
  body            text        not null,
  created_at      timestamptz not null default now(),
  deleted_at      timestamptz,
  constraint messages_pkey primary key (id),
  constraint messages_conversation_id_fkey foreign key (conversation_id)
    references public.conversations(id) on delete cascade,
  constraint messages_sender_id_fkey foreign key (sender_id)
    references public.profiles(id) on delete set null,
  constraint messages_body_len check (char_length(body) <= 4000)
);

create table if not exists public.messaging_blocks (
  blocker_id uuid        not null,
  blocked_id uuid        not null,
  created_at timestamptz not null default now(),
  constraint messaging_blocks_pkey primary key (blocker_id, blocked_id),
  constraint messaging_blocks_blocker_id_fkey foreign key (blocker_id)
    references public.profiles(id) on delete cascade,
  constraint messaging_blocks_blocked_id_fkey foreign key (blocked_id)
    references public.profiles(id) on delete cascade,
  constraint messaging_blocks_no_self check (blocker_id <> blocked_id)
);

-- One group room per Group: a partial unique index over group_id for group rooms.
create unique index if not exists idx_conversations_group_unique
  on public.conversations (group_id)
  where kind = 'group' and group_id is not null;

create index if not exists idx_conversations_last_message_at
  on public.conversations using btree (last_message_at desc);
create index if not exists idx_conversation_participants_member
  on public.conversation_participants using btree (member_id);
create index if not exists idx_messages_conversation_created
  on public.messages using btree (conversation_id, created_at);

-- ----------------------------------------------------------------------------
-- 3 · Privileges — same broad-grant + RLS-as-boundary model as every other
--     table in the baseline.
-- ----------------------------------------------------------------------------
grant all on table public.conversations              to anon, authenticated, service_role;
grant all on table public.conversation_participants  to anon, authenticated, service_role;
grant all on table public.messages                   to anon, authenticated, service_role;
grant all on table public.messaging_blocks           to anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 4 · SECURITY DEFINER helper — the participant test every read policy calls.
--     Runs as the function owner so the conversation_participants lookup does
--     NOT recursively invoke that table's own SELECT policy (the 42P17 trap the
--     groups feature hit). Never inline a self-subquery in a policy — call this.
-- ----------------------------------------------------------------------------
create or replace function public.is_conversation_participant(target_conversation_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.conversation_participants p
    where p.conversation_id = target_conversation_id
      and p.member_id = auth.uid()
  );
$$;

revoke all on function public.is_conversation_participant(uuid) from public;
grant execute on function public.is_conversation_participant(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 5 · SECURITY DEFINER RPCs — privileged writes: they enforce privacy and add
--     other people to a thread atomically (which RLS forbids clients to do).
-- ----------------------------------------------------------------------------

-- start_direct_conversation — find-or-create the 1:1 thread for the pair, after
-- checking the target is reachable (active, non-guest, not blocked either way,
-- and their dm_privacy allows it). Returns the conversation id.
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

  -- Existing direct thread for this exact pair, if any.
  select c.id into existing_id
  from public.conversations c
  where c.kind = 'direct'
    and exists (select 1 from public.conversation_participants p
                where p.conversation_id = c.id and p.member_id = caller)
    and exists (select 1 from public.conversation_participants p
                where p.conversation_id = c.id and p.member_id = target)
  limit 1;

  if existing_id is not null then
    return existing_id;
  end if;

  insert into public.conversations (kind, created_by)
  values ('direct', caller)
  returning id into new_id;

  insert into public.conversation_participants (conversation_id, member_id, added_by)
  values (new_id, caller, caller), (new_id, target, caller)
  on conflict do nothing;

  return new_id;
end;
$$;

revoke all on function public.start_direct_conversation(uuid) from public;
grant execute on function public.start_direct_conversation(uuid) to authenticated;

-- create_group_conversation — an ad-hoc group: the creator plus the selected
-- active, non-guest members.
create or replace function public.create_group_conversation(p_title text, p_member_ids uuid[])
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller      uuid := auth.uid();
  clean_title text;
  new_id      uuid;
begin
  if caller is null then
    raise exception 'Not authenticated';
  end if;

  clean_title := nullif(btrim(coalesce(p_title, '')), '');
  if clean_title is null then
    raise exception 'A group needs a name';
  end if;

  insert into public.conversations (kind, title, created_by)
  values ('group', clean_title, caller)
  returning id into new_id;

  -- The creator is always in the room.
  insert into public.conversation_participants (conversation_id, member_id, added_by)
  values (new_id, caller, caller)
  on conflict do nothing;

  -- Plus the chosen members, filtered to real, reachable people.
  insert into public.conversation_participants (conversation_id, member_id, added_by)
  select new_id, p.id, caller
  from public.profiles p
  where p.id = any (p_member_ids)
    and p.id <> caller
    and coalesce(p.is_active, true) = true
    and p.role <> 'guest'
  on conflict do nothing;

  return new_id;
end;
$$;

revoke all on function public.create_group_conversation(text, uuid[]) from public;
grant execute on function public.create_group_conversation(text, uuid[]) to authenticated;

-- open_group_conversation — the auto room for an admin Group. Caller must belong
-- to the Group; find-or-create the room and sync its participants to the current
-- roster. Idempotent, so it is safe to call on every load.
create or replace function public.open_group_conversation(p_group_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller   uuid := auth.uid();
  grp_name text;
  conv_id  uuid;
begin
  if caller is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1 from public.group_members
    where group_id = p_group_id and member_id = caller
  ) then
    raise exception 'You are not a member of this group';
  end if;

  select name into grp_name from public.groups where id = p_group_id;
  if not found then
    raise exception 'Group not found';
  end if;

  select id into conv_id
  from public.conversations
  where kind = 'group' and group_id = p_group_id
  limit 1;

  if conv_id is null then
    insert into public.conversations (kind, title, group_id, created_by)
    values ('group', grp_name, p_group_id, caller)
    returning id into conv_id;
  end if;

  -- Bring the room's participants up to date with the Group roster.
  insert into public.conversation_participants (conversation_id, member_id, added_by)
  select conv_id, gm.member_id, caller
  from public.group_members gm
  where gm.group_id = p_group_id
  on conflict do nothing;

  return conv_id;
end;
$$;

revoke all on function public.open_group_conversation(uuid) from public;
grant execute on function public.open_group_conversation(uuid) to authenticated;

-- mark_conversation_read — advance the caller's read cursor.
create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then
    raise exception 'Not authenticated';
  end if;

  update public.conversation_participants
  set last_read_at = now()
  where conversation_id = p_conversation_id
    and member_id = caller;
end;
$$;

revoke all on function public.mark_conversation_read(uuid) from public;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

-- unread_message_count — total unread across the caller's conversations. Counts
-- only messages newer than the caller's read cursor, from someone else, not
-- soft-deleted.
create or replace function public.unread_message_count()
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(count(m.id), 0)::integer
  from public.conversation_participants p
  join public.messages m
    on m.conversation_id = p.conversation_id
   and m.created_at > p.last_read_at
   and m.sender_id is distinct from p.member_id
   and m.deleted_at is null
  where p.member_id = auth.uid();
$$;

revoke all on function public.unread_message_count() from public;
grant execute on function public.unread_message_count() to authenticated;

-- ----------------------------------------------------------------------------
-- 6 · Trigger — keep conversations.last_message_at fresh so the inbox can sort
--     by recency without a per-render aggregate.
-- ----------------------------------------------------------------------------
create or replace function public.touch_conversation_last_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set last_message_at = new.created_at
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists trg_touch_conversation_last_message on public.messages;
create trigger trg_touch_conversation_last_message
  after insert on public.messages
  for each row
  execute function public.touch_conversation_last_message();

-- ----------------------------------------------------------------------------
-- 7 · RLS — participants only. Reads route through is_conversation_participant();
--     write policies let a member touch only their own row. All adds of OTHER
--     people happen via the SECURITY DEFINER RPCs above.
-- ----------------------------------------------------------------------------
alter table public.conversations             enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages                  enable row level security;
alter table public.messaging_blocks          enable row level security;

-- conversations --------------------------------------------------------------
drop policy if exists "Participants can view conversations" on public.conversations;
create policy "Participants can view conversations" on public.conversations
  as permissive for select to authenticated
  using (public.is_conversation_participant(id));

drop policy if exists "Members can create conversations" on public.conversations;
create policy "Members can create conversations" on public.conversations
  as permissive for insert to authenticated
  with check (created_by = (select auth.uid()));

drop policy if exists "Participants can update conversations" on public.conversations;
create policy "Participants can update conversations" on public.conversations
  as permissive for update to authenticated
  using (public.is_conversation_participant(id))
  with check (public.is_conversation_participant(id));

drop policy if exists "Creators can delete conversations" on public.conversations;
create policy "Creators can delete conversations" on public.conversations
  as permissive for delete to authenticated
  using (created_by = (select auth.uid()));

-- conversation_participants --------------------------------------------------
drop policy if exists "Participants can view participants" on public.conversation_participants;
create policy "Participants can view participants" on public.conversation_participants
  as permissive for select to authenticated
  using (public.is_conversation_participant(conversation_id));

drop policy if exists "Members can update own participation" on public.conversation_participants;
create policy "Members can update own participation" on public.conversation_participants
  as permissive for update to authenticated
  using (member_id = (select auth.uid()))
  with check (member_id = (select auth.uid()));

drop policy if exists "Members can leave conversations" on public.conversation_participants;
create policy "Members can leave conversations" on public.conversation_participants
  as permissive for delete to authenticated
  using (member_id = (select auth.uid()));

-- messages -------------------------------------------------------------------
drop policy if exists "Participants can view messages" on public.messages;
create policy "Participants can view messages" on public.messages
  as permissive for select to authenticated
  using (public.is_conversation_participant(conversation_id));

drop policy if exists "Participants can send messages" on public.messages;
create policy "Participants can send messages" on public.messages
  as permissive for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and public.is_conversation_participant(conversation_id)
  );

drop policy if exists "Senders can update own messages" on public.messages;
create policy "Senders can update own messages" on public.messages
  as permissive for update to authenticated
  using (sender_id = (select auth.uid()))
  with check (sender_id = (select auth.uid()));

-- messaging_blocks -----------------------------------------------------------
drop policy if exists "Members view own blocks" on public.messaging_blocks;
create policy "Members view own blocks" on public.messaging_blocks
  as permissive for select to authenticated
  using (blocker_id = (select auth.uid()));

drop policy if exists "Members add own blocks" on public.messaging_blocks;
create policy "Members add own blocks" on public.messaging_blocks
  as permissive for insert to authenticated
  with check (blocker_id = (select auth.uid()));

drop policy if exists "Members remove own blocks" on public.messaging_blocks;
create policy "Members remove own blocks" on public.messaging_blocks
  as permissive for delete to authenticated
  using (blocker_id = (select auth.uid()));

-- ----------------------------------------------------------------------------
-- 8 · Realtime — publish the three live tables so the inbox and open thread
--     update without polling.
-- ----------------------------------------------------------------------------
do $$
declare
  t text;
  wanted text[] := array['conversations', 'conversation_participants', 'messages'];
begin
  foreach t in array wanted loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end$$;

-- ----------------------------------------------------------------------------
-- 9 · Permission seed — `use_messaging` gates the Messages tab. Granted to every
--     non-guest role (head_admin inherits the full catalogue in the app anyway).
-- ----------------------------------------------------------------------------
insert into public.permissions (permission_key, name, description, category)
values (
  'use_messaging',
  'Use Messaging',
  'Open the Messages tab to send private direct and group messages to members.',
  'Workspace'
)
on conflict (permission_key) do update
set name = excluded.name,
    description = excluded.description,
    category = excluded.category;

insert into public.role_permissions (role_key, permission_key)
select role_key, 'use_messaging'
from public.role_definitions
where role_key in ('member', 'executive', 'administrator', 'head_admin')
on conflict (role_key, permission_key) do nothing;

-- ============================================================================
-- END OF 20260916000000_messaging.sql
-- ============================================================================
