-- ============================================================================
-- 20260916100000_messaging_breakglass.sql
--
-- Messaging safety & "break-glass" — the ONLY path by which a head admin can
-- read a private conversation, and only under strict, unanimous, time-limited,
-- fully-audited approval. Builds on 20260916000000_messaging.sql.
--
-- CONTEXT
--   Conversations are private: 20260916000000_messaging.sql gives admins no read
--   path at all. Real clubs still need a safety valve for harassment or threats.
--   This migration adds that valve WITHOUT handing admins a standing key:
--
--     1. conversation_reports  — a participant's report ('reported') OR a
--                                head-admin-initiated concern ('suspected').
--     2. breakglass_grants     — a request to read one conversation; goes 'active'
--                                only after a UNANIMOUS head-admin vote, and then
--                                expires after 72 hours.
--     3. breakglass_votes      — one row per head admin per grant.
--
--   ACCESS RULE (can_admin_read_conversation): a head admin may read a
--   conversation ONLY while an 'active', not-yet-expired grant exists for it.
--   Nothing else — not role, not seniority — opens a conversation. The three
--   messaging SELECT policies are extended to also honour this single path.
--
--   APPROVAL RULE: break-glass is available only when there are >= 3 head admins,
--   and EVERY current active head admin must vote yes. Any single "no" denies it.
--   The opener's initiation counts as their yes. Two entry paths:
--     - 'reported'  — a participant reported the chat; their report is consent.
--     - 'suspected' — head admins act on a safety concern with no report. Same
--                     unanimous >= 3 gate — there is no faster single-admin path.
--
--   TRANSPARENCY: when a grant activates, every participant is notified that
--   their conversation was opened for review ("report back"). Every step also
--   writes an admin_activity_log row.
--
--   This is an access-control valve, not encryption — see the honesty note in
--   20260916000000_messaging.sql. Whoever holds the raw DB keys can already read
--   any row; this migration governs access THROUGH THE APP.
--
-- IDEMPOTENT
--   create table IF NOT EXISTS, guarded constraints, create-or-replace functions,
--   drop-policy-before-create. Safe to run more than once.
--
-- APPLY
--   Run AFTER 20260916000000_messaging.sql on the next Supabase reconnect. Until
--   applied, the report button and Safety-review surface degrade quietly (the
--   isSchemaMissingError pattern) and messaging keeps working without them.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1 · Tables.
-- ----------------------------------------------------------------------------
create table if not exists public.conversation_reports (
  id              uuid        not null default gen_random_uuid(),
  conversation_id uuid        not null,
  reporter_id     uuid,
  reason          text,
  kind            text        not null default 'reported',
  status          text        not null default 'open',
  created_at      timestamptz not null default now(),
  constraint conversation_reports_pkey primary key (id),
  constraint conversation_reports_conversation_id_fkey foreign key (conversation_id)
    references public.conversations(id) on delete cascade,
  constraint conversation_reports_reporter_id_fkey foreign key (reporter_id)
    references public.profiles(id) on delete set null,
  constraint conversation_reports_kind_check check (kind in ('reported', 'suspected')),
  constraint conversation_reports_status_check
    check (status in ('open', 'approved', 'denied', 'expired', 'closed'))
);

create table if not exists public.breakglass_grants (
  id              uuid        not null default gen_random_uuid(),
  conversation_id uuid        not null,
  report_id       uuid,
  requested_by    uuid,
  reason          text,
  kind            text        not null default 'suspected',
  status          text        not null default 'pending',
  expires_at      timestamptz,
  created_at      timestamptz not null default now(),
  constraint breakglass_grants_pkey primary key (id),
  constraint breakglass_grants_conversation_id_fkey foreign key (conversation_id)
    references public.conversations(id) on delete cascade,
  constraint breakglass_grants_report_id_fkey foreign key (report_id)
    references public.conversation_reports(id) on delete set null,
  constraint breakglass_grants_requested_by_fkey foreign key (requested_by)
    references public.profiles(id) on delete set null,
  constraint breakglass_grants_kind_check check (kind in ('reported', 'suspected')),
  constraint breakglass_grants_status_check
    check (status in ('pending', 'active', 'denied', 'expired'))
);

create table if not exists public.breakglass_votes (
  grant_id      uuid        not null,
  head_admin_id uuid        not null,
  vote          boolean     not null,
  voted_at      timestamptz not null default now(),
  constraint breakglass_votes_pkey primary key (grant_id, head_admin_id),
  constraint breakglass_votes_grant_id_fkey foreign key (grant_id)
    references public.breakglass_grants(id) on delete cascade,
  constraint breakglass_votes_head_admin_id_fkey foreign key (head_admin_id)
    references public.profiles(id) on delete cascade
);

-- At most one live (pending or active) grant per conversation. Expired 'active'
-- rows are swept to 'expired' by open_breakglass before a fresh grant is filed,
-- so this never blocks a legitimate re-request.
create unique index if not exists idx_breakglass_grants_one_live
  on public.breakglass_grants (conversation_id)
  where status in ('pending', 'active');

create index if not exists idx_conversation_reports_conversation
  on public.conversation_reports using btree (conversation_id, status);
create index if not exists idx_breakglass_grants_conversation
  on public.breakglass_grants using btree (conversation_id, status);

-- ----------------------------------------------------------------------------
-- 2 · Privileges — broad grants; RLS + the SECURITY DEFINER RPCs are the boundary.
-- ----------------------------------------------------------------------------
grant all on table public.conversation_reports to anon, authenticated, service_role;
grant all on table public.breakglass_grants    to anon, authenticated, service_role;
grant all on table public.breakglass_votes     to anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 3 · Helpers (SECURITY DEFINER).
-- ----------------------------------------------------------------------------

-- head_admin_count — how many ACTIVE head admins exist. Break-glass needs >= 3.
create or replace function public.head_admin_count()
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select count(*)::integer
  from public.profiles
  where role = 'head_admin' and is_active = true;
$$;

revoke all on function public.head_admin_count() from public;
grant execute on function public.head_admin_count() to authenticated;

-- can_admin_read_conversation — the ONLY admin read path. True only when the
-- caller is an active head admin AND an 'active', not-yet-expired grant exists
-- for the conversation. The expires_at check IS the auto-expiry: once the 72h
-- window passes, access stops even if the status column has not been swept.
create or replace function public.can_admin_read_conversation(target_conversation_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_head_admin()
    and exists (
      select 1
      from public.breakglass_grants g
      where g.conversation_id = target_conversation_id
        and g.status = 'active'
        and g.expires_at is not null
        and g.expires_at > now()
    );
$$;

revoke all on function public.can_admin_read_conversation(uuid) from public;
grant execute on function public.can_admin_read_conversation(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 4 · RPCs (SECURITY DEFINER) — every state change routes through one of these,
--     and each writes an admin_activity_log row.
-- ----------------------------------------------------------------------------

-- report_conversation — a participant reports their own conversation. The report
-- is the participant's consent for the 'reported' break-glass path.
create or replace function public.report_conversation(p_conversation_id uuid, p_reason text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller       uuid := auth.uid();
  clean_reason text;
  new_id       uuid;
begin
  if caller is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_conversation_participant(p_conversation_id) then
    raise exception 'You can only report a conversation you are part of';
  end if;

  clean_reason := nullif(btrim(coalesce(p_reason, '')), '');

  insert into public.conversation_reports (conversation_id, reporter_id, reason, kind, status)
  values (p_conversation_id, caller, clean_reason, 'reported', 'open')
  returning id into new_id;

  insert into public.admin_activity_log (admin_id, action, target_user_id, details)
  values (caller, 'MESSAGING_REPORT', null,
          'Reported conversation ' || p_conversation_id::text
          || coalesce(' — ' || clean_reason, ''));

  return new_id;
end;
$$;

revoke all on function public.report_conversation(uuid, text) from public;
grant execute on function public.report_conversation(uuid, text) to authenticated;

-- open_breakglass — a head admin files a request to read one conversation.
-- Requires >= 3 active head admins. 'reported' needs an open report; 'suspected'
-- is head-admin-initiated (a report row of kind 'suspected' is recorded for the
-- audit trail). The opener's initiation is recorded as their approving vote.
create or replace function public.open_breakglass(
  p_conversation_id uuid,
  p_reason          text,
  p_kind            text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller       uuid := auth.uid();
  clean_kind   text;
  clean_reason text;
  report_ref   uuid;
  new_id       uuid;
begin
  if caller is null then
    raise exception 'Not authenticated';
  end if;
  if not public.is_head_admin() then
    raise exception 'Only head admins can open break-glass access';
  end if;
  if public.head_admin_count() < 3 then
    raise exception 'Break-glass needs at least 3 head admins';
  end if;

  clean_kind := lower(coalesce(p_kind, 'suspected'));
  if clean_kind not in ('reported', 'suspected') then
    raise exception 'Invalid break-glass kind';
  end if;
  clean_reason := nullif(btrim(coalesce(p_reason, '')), '');

  -- Retire any grant whose 72h window has already lapsed so the one-live-grant
  -- index and the guard below agree on what "still open" means.
  update public.breakglass_grants
  set status = 'expired'
  where conversation_id = p_conversation_id
    and status = 'active'
    and expires_at is not null
    and expires_at <= now();

  if exists (
    select 1 from public.breakglass_grants
    where conversation_id = p_conversation_id
      and status in ('pending', 'active')
  ) then
    raise exception 'A break-glass request is already open for this conversation';
  end if;

  if clean_kind = 'reported' then
    select id into report_ref
    from public.conversation_reports
    where conversation_id = p_conversation_id
      and status = 'open'
    order by created_at desc
    limit 1;
    if report_ref is null then
      raise exception 'No open report for this conversation';
    end if;
  else
    insert into public.conversation_reports (conversation_id, reporter_id, reason, kind, status)
    values (p_conversation_id, caller, clean_reason, 'suspected', 'open')
    returning id into report_ref;
  end if;

  insert into public.breakglass_grants
    (conversation_id, report_id, requested_by, reason, kind, status)
  values (p_conversation_id, report_ref, caller, clean_reason, clean_kind, 'pending')
  returning id into new_id;

  insert into public.breakglass_votes (grant_id, head_admin_id, vote)
  values (new_id, caller, true)
  on conflict (grant_id, head_admin_id) do nothing;

  insert into public.admin_activity_log (admin_id, action, target_user_id, details)
  values (caller, 'MESSAGING_BREAKGLASS_OPENED', null,
          'Opened ' || clean_kind || ' break-glass for conversation '
          || p_conversation_id::text || coalesce(' — ' || clean_reason, ''));

  return new_id;
end;
$$;

revoke all on function public.open_breakglass(uuid, text, text) from public;
grant execute on function public.open_breakglass(uuid, text, text) to authenticated;

-- open_suspected_breakglass — the suspected path's entry point. A head admin has
-- no visibility into conversations they are not in, so they cannot supply a
-- conversation id; instead they name the two members whose DM is in question.
-- Resolves that pair's direct conversation and delegates to open_breakglass with
-- kind 'suspected'. Never creates a conversation — you cannot review one that
-- does not exist. Group-chat suspected review is out of scope for this pass.
create or replace function public.open_suspected_breakglass(
  p_member_a uuid,
  p_member_b uuid,
  p_reason   text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller  uuid := auth.uid();
  conv_id uuid;
begin
  if caller is null then
    raise exception 'Not authenticated';
  end if;
  if not public.is_head_admin() then
    raise exception 'Only head admins can open break-glass access';
  end if;
  if p_member_a is null or p_member_b is null or p_member_a = p_member_b then
    raise exception 'Pick two different members';
  end if;

  select c.id into conv_id
  from public.conversations c
  where c.kind = 'direct'
    and exists (select 1 from public.conversation_participants p
                where p.conversation_id = c.id and p.member_id = p_member_a)
    and exists (select 1 from public.conversation_participants p
                where p.conversation_id = c.id and p.member_id = p_member_b)
  limit 1;

  if conv_id is null then
    raise exception 'No direct conversation exists between those members';
  end if;

  return public.open_breakglass(conv_id, p_reason, 'suspected');
end;
$$;

revoke all on function public.open_suspected_breakglass(uuid, uuid, text) from public;
grant execute on function public.open_suspected_breakglass(uuid, uuid, text) to authenticated;

-- vote_breakglass — a head admin casts (or changes) their vote while the grant is
-- pending. Any "no" denies it immediately. Once EVERY current active head admin
-- has voted yes, the grant activates for 72 hours and every participant is
-- notified. Returns the grant's resulting status.
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

  if yes_count >= admins then
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

-- breakglass_queue — the Safety-review surface. Returns the live grants with a
-- live tally and the caller's own vote. Self-gates to head admins (empty for
-- everyone else), so it is safe to grant to all authenticated members.
create or replace function public.breakglass_queue()
returns table (
  grant_id        uuid,
  conversation_id uuid,
  kind            text,
  reason          text,
  status          text,
  requested_by    uuid,
  created_at      timestamptz,
  expires_at      timestamptz,
  yes_count       integer,
  no_count        integer,
  head_admins     integer,
  my_vote         boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select
    g.id,
    g.conversation_id,
    g.kind,
    g.reason,
    g.status,
    g.requested_by,
    g.created_at,
    g.expires_at,
    (select count(*)::integer
       from public.breakglass_votes v
       join public.profiles p on p.id = v.head_admin_id
      where v.grant_id = g.id and v.vote is true
        and p.role = 'head_admin' and p.is_active = true),
    (select count(*)::integer
       from public.breakglass_votes v
       join public.profiles p on p.id = v.head_admin_id
      where v.grant_id = g.id and v.vote is false
        and p.role = 'head_admin' and p.is_active = true),
    public.head_admin_count(),
    (select v.vote from public.breakglass_votes v
      where v.grant_id = g.id and v.head_admin_id = auth.uid())
  from public.breakglass_grants g
  where public.is_head_admin()
    and g.status in ('pending', 'active')
    and (g.status <> 'active' or g.expires_at is null or g.expires_at > now())
  order by g.created_at desc;
$$;

revoke all on function public.breakglass_queue() from public;
grant execute on function public.breakglass_queue() to authenticated;

-- ----------------------------------------------------------------------------
-- 5 · RLS on the new tables — reads for head admins (and the reporter's own
--     reports); every write goes through the SECURITY DEFINER RPCs above, so
--     there are deliberately NO client insert/update/delete policies.
-- ----------------------------------------------------------------------------
alter table public.conversation_reports enable row level security;
alter table public.breakglass_grants    enable row level security;
alter table public.breakglass_votes     enable row level security;

drop policy if exists "Reporters and head admins view reports" on public.conversation_reports;
create policy "Reporters and head admins view reports" on public.conversation_reports
  as permissive for select to authenticated
  using (reporter_id = (select auth.uid()) or public.is_head_admin());

drop policy if exists "Head admins view grants" on public.breakglass_grants;
create policy "Head admins view grants" on public.breakglass_grants
  as permissive for select to authenticated
  using (public.is_head_admin());

drop policy if exists "Head admins view votes" on public.breakglass_votes;
create policy "Head admins view votes" on public.breakglass_votes
  as permissive for select to authenticated
  using (public.is_head_admin());

-- ----------------------------------------------------------------------------
-- 6 · Extend the messaging SELECT policies with the single admin read path.
--     A head admin sees a conversation's rows ONLY while an active grant holds
--     (can_admin_read_conversation); participants are unaffected.
-- ----------------------------------------------------------------------------
drop policy if exists "Participants can view conversations" on public.conversations;
create policy "Participants can view conversations" on public.conversations
  as permissive for select to authenticated
  using (
    public.is_conversation_participant(id)
    or public.can_admin_read_conversation(id)
  );

drop policy if exists "Participants can view participants" on public.conversation_participants;
create policy "Participants can view participants" on public.conversation_participants
  as permissive for select to authenticated
  using (
    public.is_conversation_participant(conversation_id)
    or public.can_admin_read_conversation(conversation_id)
  );

drop policy if exists "Participants can view messages" on public.messages;
create policy "Participants can view messages" on public.messages
  as permissive for select to authenticated
  using (
    public.is_conversation_participant(conversation_id)
    or public.can_admin_read_conversation(conversation_id)
  );

-- ============================================================================
-- END OF 20260916100000_messaging_breakglass.sql
-- ============================================================================
