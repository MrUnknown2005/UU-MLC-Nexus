-- ============================================================================
-- 20260919000000_messaging_rls_hardening.sql
--
-- Row-Level-Security hardening for the Messaging + break-glass feature. Closes
-- six holes found in the 2026-09-19 full-repo security sweep against the LIVE
-- (already-applied) messaging schema. No client change is needed — every fix is
-- a policy, helper, or trigger; the app keeps calling the same service/RPCs.
--
--   H1  A member could relocate their own participant row to ANY conversation id
--       ("Members can update own participation" pinned member_id but never
--       conversation_id, and the PK is (conversation_id, member_id)) and thereby
--       read any thread whose id they learned. FIX: drop that UPDATE policy —
--       the only legitimate write to a participant row is the read cursor, and
--       that is done exclusively through the mark_conversation_read RPC.
--
--   H2  Deactivated / guest / unpermitted accounts kept FULL messaging: the read
--       policies and the message-insert check tested participancy only, and the
--       four SECURITY DEFINER RPCs checked "caller is null" but never the
--       caller's status. FIX: fold has_permission('use_messaging') into the
--       is_conversation_participant() chokepoint (closes every read + the direct
--       message insert), and add a BEFORE INSERT guard on the three write tables
--       that rejects any end-user write from an account without use_messaging —
--       which also covers the RPC creation paths, since auth.uid() inside a
--       SECURITY DEFINER RPC is still the calling member. has_permission() is
--       exactly the client-side canUseMessaging gate (active AND role grants
--       use_messaging), so server and client now agree.
--
--   H3  Any participant could UPDATE a conversation's identity columns
--       ("Participants can update conversations" was column-unrestricted) — set
--       created_by = self, then invoke the creators-only DELETE to CASCADE-wipe
--       the whole thread for everyone, or null direct_key / edit kind / group_id.
--       FIX: a BEFORE UPDATE trigger freezes created_by / kind / group_id /
--       direct_key against end-user updates (title + last_message_at stay
--       editable, so the touch trigger and any rename keep working).
--
--   M1  vote_breakglass activated on yes_count >= head_admin_count() computed at
--       vote time, so attrition (or a rogue head admin deactivating peers) below
--       three could activate access under the >= 3-unanimous floor. FIX: also
--       require head_admin_count() >= 3 at activation, not only at open.
--
--   M2  Blocks were enforced only when a DM was first opened; a block added to an
--       already-existing direct thread did not stop further messages. FIX: a
--       BEFORE INSERT trigger on messages rejects a send on a direct thread when
--       either party has blocked the other.
--
--   M3  Removing a member from a Group left their conversation_participants row
--       in the Group's auto-room, so they kept reading and posting. FIX: an
--       AFTER DELETE trigger on group_members removes the matching participant
--       row (only for an individual removal — a whole-group deletion, whose
--       parent row is already gone when the cascade fires, is left alone, exactly
--       as conversations.group_id ON DELETE SET NULL already handles it).
--
-- IDEMPOTENT
--   drop-policy-before-nothing, create-or-replace functions, drop-trigger-before-
--   create. Safe to run more than once.
--
-- APPLY  (by hand — SQL editor / write-mode session, NOT `supabase db push`)
--   Run AFTER 20260918000000_dedupe_direct_conversations.sql. The direct_key
--   freeze in H3 is written to be order-independent (it checks whether the column
--   exists), so it is correct whether or not dedupe ran first, but dedupe is the
--   intended predecessor. Restore the Supabase MCP to --read-only afterwards.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- H1 · Drop the over-broad participant UPDATE policy.
--
--   The PK is (conversation_id, member_id); the policy pinned only member_id, so
--   `update conversation_participants set conversation_id = '<any>' where
--   member_id = self` moved the caller's own row into a thread they were never
--   in, and is_conversation_participant() then returned true for it. Nothing the
--   app does needs this policy: leaving a thread is a DELETE (its own policy),
--   and the read cursor (last_read_at) is advanced only by the
--   mark_conversation_read SECURITY DEFINER RPC. So we simply remove it.
-- ----------------------------------------------------------------------------
drop policy if exists "Members can update own participation" on public.conversation_participants;

-- ----------------------------------------------------------------------------
-- H2 (reads) · Fold the use_messaging permission into the participant chokepoint.
--
--   Every messaging read policy and the direct message-insert check route through
--   is_conversation_participant(); adding has_permission('use_messaging') here
--   closes reads AND the direct send for deactivated / guest / unpermitted
--   accounts in one place. has_permission() already tests is_active = true and
--   that the caller's role grants use_messaging, so a deactivated account (whose
--   role resolves to none of the granted roles), a guest, and any custom role
--   without the grant all evaluate to false — matching the client gate exactly.
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
  )
  and public.has_permission('use_messaging');
$$;

revoke all on function public.is_conversation_participant(uuid) from public;
grant execute on function public.is_conversation_participant(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- H2 (writes) · Require use_messaging for every end-user write to the messaging
--   tables. is_conversation_participant() guards the RLS insert path, but the
--   conversation / participant rows created inside the SECURITY DEFINER RPCs run
--   as the function owner and bypass RLS — so a deactivated caller could still
--   spawn threads. A BEFORE INSERT trigger fires in BOTH paths (triggers are not
--   bypassed by definer rights) and, since auth.uid() inside a definer RPC is
--   still the calling member, blocks the unpermitted caller without touching a
--   single RPC body. auth.uid() IS NULL (migrations, service_role maintenance)
--   is intentionally skipped so trusted server contexts are never blocked.
-- ----------------------------------------------------------------------------
create or replace function public.messaging_require_use_permission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.has_permission('use_messaging') then
    raise exception 'Your account is not allowed to use messaging';
  end if;
  return new;
end;
$$;

revoke execute on function public.messaging_require_use_permission() from authenticated;

drop trigger if exists trg_conversations_require_use on public.conversations;
create trigger trg_conversations_require_use
  before insert on public.conversations
  for each row execute function public.messaging_require_use_permission();

drop trigger if exists trg_participants_require_use on public.conversation_participants;
create trigger trg_participants_require_use
  before insert on public.conversation_participants
  for each row execute function public.messaging_require_use_permission();

drop trigger if exists trg_messages_require_use on public.messages;
create trigger trg_messages_require_use
  before insert on public.messages
  for each row execute function public.messaging_require_use_permission();

-- ----------------------------------------------------------------------------
-- H3 · Freeze a conversation's identity columns against end-user UPDATEs.
--
--   "Participants can update conversations" is column-unrestricted, and the
--   DELETE policy trusts created_by. Freezing created_by (plus kind / group_id /
--   direct_key) means a non-creator can never make themselves the creator, so the
--   creators-only cascade-delete stays out of their reach, and the canonical
--   direct_key / thread kind cannot be tampered with. title and last_message_at
--   remain writable, so touch_conversation_last_message and group renames still
--   work. Trusted server contexts (auth.uid() IS NULL) may still correct fields.
-- ----------------------------------------------------------------------------
create or replace function public.conversations_freeze_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    if new.created_by is distinct from old.created_by
       or new.kind is distinct from old.kind
       or new.group_id is distinct from old.group_id then
      raise exception 'This conversation field cannot be changed';
    end if;
    -- direct_key exists only once 20260918000000_dedupe_direct_conversations has
    -- run; the presence test keeps this trigger order-independent.
    if to_jsonb(new) ? 'direct_key'
       and (to_jsonb(new) ->> 'direct_key') is distinct from (to_jsonb(old) ->> 'direct_key') then
      raise exception 'This conversation field cannot be changed';
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function public.conversations_freeze_identity() from authenticated;

drop trigger if exists trg_conversations_freeze_identity on public.conversations;
create trigger trg_conversations_freeze_identity
  before update on public.conversations
  for each row execute function public.conversations_freeze_identity();

-- ----------------------------------------------------------------------------
-- M2 · Enforce blocks on every send, not only at DM creation.
--
--   For a direct thread, refuse the insert when either party has blocked the
--   other — closing the window where a block is added AFTER the DM already
--   exists. Group threads are unaffected, matching the creation-time rule.
--   new.sender_id is the caller (the message insert check pins sender_id =
--   auth.uid()), so this reads the block list from the sender's perspective.
-- ----------------------------------------------------------------------------
create or replace function public.messages_enforce_block()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.conversations c
    where c.id = new.conversation_id and c.kind = 'direct'
  ) and exists (
    select 1
    from public.conversation_participants p
    join public.messaging_blocks b
      on (b.blocker_id = new.sender_id and b.blocked_id = p.member_id)
      or (b.blocker_id = p.member_id and b.blocked_id = new.sender_id)
    where p.conversation_id = new.conversation_id
      and p.member_id <> new.sender_id
  ) then
    raise exception 'Messaging is blocked between these members';
  end if;
  return new;
end;
$$;

revoke execute on function public.messages_enforce_block() from authenticated;

drop trigger if exists trg_messages_enforce_block on public.messages;
create trigger trg_messages_enforce_block
  before insert on public.messages
  for each row execute function public.messages_enforce_block();

-- ----------------------------------------------------------------------------
-- M3 · Removing a member from a Group revokes their auto-room access.
--
--   Group membership is additive-synced into the room by open_group_conversation
--   but was never subtracted, so a removed member kept their participant row.
--   Mirror the removal here. The `exists(groups)` guard distinguishes an
--   individual removal (parent Group still present → revoke) from a whole-group
--   deletion (the parent row is already deleted when this cascade fires → leave
--   the room, whose group_id is being SET NULL, untouched).
-- ----------------------------------------------------------------------------
create or replace function public.sync_group_member_removal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.groups g where g.id = old.group_id) then
    delete from public.conversation_participants cp
    using public.conversations c
    where c.kind = 'group'
      and c.group_id = old.group_id
      and cp.conversation_id = c.id
      and cp.member_id = old.member_id;
  end if;
  return old;
end;
$$;

revoke execute on function public.sync_group_member_removal() from authenticated;

drop trigger if exists trg_sync_group_member_removal on public.group_members;
create trigger trg_sync_group_member_removal
  after delete on public.group_members
  for each row execute function public.sync_group_member_removal();

-- ----------------------------------------------------------------------------
-- M1 · Re-assert the >= 3-head-admin floor at break-glass ACTIVATION.
--
--   Reproduced verbatim from 20260916100000_messaging_breakglass.sql with ONE
--   change: activation now requires `admins >= 3` as well as `yes_count >= admins`
--   (the flagged line, marked below). open_breakglass already checks the floor at
--   OPEN time; this closes the gap where the active-head-admin count falls below
--   three between open and the deciding vote.
-- ----------------------------------------------------------------------------
create or replace function public.vote_breakglass(p_grant_id uuid, p_vote boolean)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  caller    uuid := auth.uid();
  g         record;
  yes_count integer;
  no_count  integer;
  admins    integer;
  part      record;
begin
  if caller is null then
    raise exception 'Not authenticated';
  end if;
  if not public.is_head_admin() then
    raise exception 'Only head admins can vote on break-glass access';
  end if;

  select * into g from public.breakglass_grants where id = p_grant_id;
  if not found then
    raise exception 'Break-glass request not found';
  end if;
  if g.status <> 'pending' then
    raise exception 'This break-glass request is already %', g.status;
  end if;

  insert into public.breakglass_votes (grant_id, head_admin_id, vote)
  values (p_grant_id, caller, p_vote)
  on conflict (grant_id, head_admin_id)
  do update set vote = excluded.vote, voted_at = now();

  admins := public.head_admin_count();

  -- Tally only votes cast by CURRENT active head admins, so a demoted admin's
  -- stale vote never blocks or forces a decision.
  select
    count(*) filter (where v.vote is true),
    count(*) filter (where v.vote is false)
  into yes_count, no_count
  from public.breakglass_votes v
  join public.profiles p on p.id = v.head_admin_id
  where v.grant_id = p_grant_id
    and p.role = 'head_admin'
    and p.is_active = true;

  if no_count > 0 then
    update public.breakglass_grants set status = 'denied' where id = p_grant_id;
    update public.conversation_reports set status = 'denied'
    where id = g.report_id and status = 'open';

    insert into public.admin_activity_log (admin_id, action, target_user_id, details)
    values (caller, 'MESSAGING_BREAKGLASS_DENIED', null,
            'Break-glass denied for conversation ' || g.conversation_id::text);

    return 'denied';
  end if;

  -- M1: unanimous AND never below the three-head-admin floor.
  if yes_count >= admins and admins >= 3 then
    update public.breakglass_grants
    set status = 'active', expires_at = now() + interval '72 hours'
    where id = p_grant_id;
    update public.conversation_reports set status = 'approved'
    where id = g.report_id and status = 'open';

    insert into public.admin_activity_log (admin_id, action, target_user_id, details)
    values (caller, 'MESSAGING_BREAKGLASS_ACTIVATED', null,
            'Break-glass activated for conversation ' || g.conversation_id::text
            || ' (expires in 72h)');

    -- Transparency: tell every participant their conversation was opened.
    for part in
      select member_id from public.conversation_participants
      where conversation_id = g.conversation_id
    loop
      insert into public.notifications
        (user_id, type, title, message, target_tab, related_id)
      values (
        part.member_id, 'message',
        'A conversation was opened for safety review',
        'Head admins unanimously approved time-limited access to one of your '
        || 'conversations following a report or safety concern. This access is '
        || 'logged and expires automatically.',
        'messages', g.conversation_id::text
      );
    end loop;

    return 'active';
  end if;

  return 'pending';
end;
$$;

revoke all on function public.vote_breakglass(uuid, boolean) from public;
grant execute on function public.vote_breakglass(uuid, boolean) to authenticated;

-- ============================================================================
-- END OF 20260919000000_messaging_rls_hardening.sql
-- ============================================================================
