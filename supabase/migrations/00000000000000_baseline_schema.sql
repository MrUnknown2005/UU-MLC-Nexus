-- ============================================================================
-- UU-MLC Nexus — BASELINE SCHEMA (full live snapshot)
-- ============================================================================
-- Reconstructed from the live project (scgqhsxfzqvsqiugnceg) on 2026-09-08 by
-- reading the Postgres catalogs (pg_get_functiondef / pg_get_constraintdef /
-- pg_policies / information_schema). It captures the COMPLETE current state of
-- the `public` schema plus the storage policies, buckets, and the realtime
-- publication — i.e. everything the app depends on.
--
-- WHY THIS FILE EXISTS
--   The repo historically did not hold the DDL for the pre-Aug-2022 objects,
--   the realtime publication, or the notification-clearing RPCs, so it could
--   NOT rebuild the database from scratch (the Phase 4 "migration drift"
--   landmine). This baseline closes that gap: it is a single, standalone,
--   idempotent script that recreates the entire schema.
--
-- RELATIONSHIP TO THE TIMESTAMPED MIGRATIONS
--   This baseline is a SUPERSET of every incremental migration in this folder
--   (20260822*, 20260902_realtime_publication, 20260907_notification_clearing,
--   20260908013032_phase4_db_hardening). Those files remain as the historical
--   change-by-change record and match the live project's migration history.
--   • To rebuild a FRESH database: run THIS FILE ALONE. Do not also replay the
--     incrementals (they would collide with objects this file already creates).
--   • The live project already has this exact state; running this file against
--     it is a safe near-no-op (every statement is guarded / idempotent).
--   See supabase/migrations/README.md for the full procedure.
--
-- ASSUMES a stock Supabase project: the `auth` and `storage` schemas, the
-- `anon` / `authenticated` / `service_role` roles, the `supabase_realtime`
-- publication, and the default extensions (pgcrypto, uuid-ossp, supabase_vault)
-- already exist. Reference-data seeding (role_definitions / permissions /
-- role_permissions rows) is DATA, not schema, and is intentionally out of scope
-- here — seed those separately after running this baseline.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1 · TABLES  (created in FK-dependency order; constraints inlined & named to
--     match the live catalog. `if not exists` makes re-runs safe.)
-- ----------------------------------------------------------------------------

create table if not exists public.role_definitions (
  role_key    text        not null,
  name        text        not null,
  description text,
  is_system   boolean     not null default false,
  created_by  uuid,
  created_at  timestamptz not null default now(),
  constraint role_definitions_pkey primary key (role_key),
  constraint role_definitions_created_by_fkey foreign key (created_by)
    references auth.users(id) on delete set null
);

create table if not exists public.permissions (
  permission_key text        not null,
  name           text        not null,
  description    text,
  category       text        not null default 'Other'::text,
  created_at     timestamptz not null default now(),
  constraint permissions_pkey primary key (permission_key)
);

create table if not exists public.profiles (
  id         uuid        not null,
  full_name  text,
  nickname   text,
  bio        text,
  avatar_url text,
  role       text        not null default 'guest'::text,
  points     integer     not null default 0,
  created_at timestamptz not null default now(),
  is_active  boolean     not null default true,
  dm_privacy text        not null default 'everyone'::text,
  constraint profiles_pkey primary key (id),
  constraint profiles_id_fkey foreign key (id)
    references auth.users(id) on delete cascade,
  constraint profiles_role_fkey foreign key (role)
    references public.role_definitions(role_key),
  constraint profiles_points_nonneg check (points >= 0),
  constraint profiles_full_name_len check (full_name is null or char_length(full_name) <= 120),
  constraint profiles_nickname_len  check (nickname  is null or char_length(nickname)  <= 80),
  constraint profiles_bio_len       check (bio       is null or char_length(bio)       <= 2000),
  constraint profiles_dm_privacy_check check (dm_privacy in ('everyone', 'groups', 'none'))
);

create table if not exists public.role_permissions (
  role_key       text        not null,
  permission_key text        not null,
  created_at     timestamptz not null default now(),
  constraint role_permissions_pkey primary key (role_key, permission_key),
  constraint role_permissions_role_key_fkey foreign key (role_key)
    references public.role_definitions(role_key) on delete cascade,
  constraint role_permissions_permission_key_fkey foreign key (permission_key)
    references public.permissions(permission_key) on delete cascade
);

create table if not exists public.achievements (
  id          uuid        not null default gen_random_uuid(),
  name        text        not null,
  description text        default ''::text,
  icon        text        default '🏅'::text,
  created_by  uuid,
  created_at  timestamptz not null default now(),
  constraint achievements_pkey primary key (id),
  constraint achievements_name_key unique (name),
  constraint achievements_created_by_fkey foreign key (created_by)
    references public.profiles(id) on delete set null
);

create table if not exists public.profile_achievements (
  id             uuid        not null default gen_random_uuid(),
  user_id        uuid        not null,
  achievement_id uuid        not null,
  awarded_by     uuid,
  awarded_at     timestamptz not null default now(),
  constraint profile_achievements_pkey primary key (id),
  constraint profile_achievements_user_id_achievement_id_key unique (user_id, achievement_id),
  constraint profile_achievements_user_id_fkey foreign key (user_id)
    references public.profiles(id) on delete cascade,
  constraint profile_achievements_achievement_id_fkey foreign key (achievement_id)
    references public.achievements(id) on delete cascade,
  constraint profile_achievements_awarded_by_fkey foreign key (awarded_by)
    references public.profiles(id) on delete set null
);

create table if not exists public.news (
  id          bigint      generated by default as identity,
  title       text        not null,
  content     text        not null,
  image_url   text,
  published_by uuid,
  created_at  timestamptz not null default now(),
  constraint news_pkey primary key (id),
  constraint news_published_by_fkey foreign key (published_by)
    references public.profiles(id),
  constraint news_title_len   check (char_length(title)   <= 300),
  constraint news_content_len check (char_length(content) <= 20000)
);

create table if not exists public.point_history (
  id         bigint      generated by default as identity,
  member_id  uuid        not null,
  points     integer     not null,
  reason     text        not null,
  awarded_by uuid,
  created_at timestamptz not null default now(),
  constraint point_history_pkey primary key (id),
  constraint point_history_member_id_fkey foreign key (member_id)
    references public.profiles(id) on delete cascade,
  constraint point_history_awarded_by_fkey foreign key (awarded_by)
    references public.profiles(id),
  constraint point_history_reason_len check (char_length(reason) <= 500)
);

create table if not exists public.point_reset_history (
  id       bigint      generated by default as identity,
  reset_by uuid        not null,
  reset_at timestamptz not null default now(),
  constraint point_reset_history_pkey primary key (id),
  constraint point_reset_history_reset_by_fkey foreign key (reset_by)
    references public.profiles(id)
);

create table if not exists public.todos (
  id           uuid        not null default gen_random_uuid(),
  title        text        not null,
  description  text        default ''::text,
  deadline     date,
  completed    boolean     not null default false,
  completed_at timestamptz,
  created_by   uuid,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  image_url    text,
  assigned_to  uuid,
  completed_by uuid,
  points       integer     not null default 0,
  constraint todos_pkey primary key (id),
  constraint todos_assigned_to_fkey foreign key (assigned_to)
    references public.profiles(id) on delete set null,
  constraint todos_completed_by_fkey foreign key (completed_by)
    references public.profiles(id) on delete set null,
  constraint todos_created_by_fkey foreign key (created_by)
    references public.profiles(id) on delete set null,
  constraint todos_title_len check (char_length(title) <= 300),
  constraint todos_desc_len  check (description is null or char_length(description) <= 5000),
  constraint todos_points_nonneg check (points >= 0)
);

create table if not exists public.todo_activity_log (
  id         uuid        not null default gen_random_uuid(),
  todo_id    uuid        not null,
  actor_id   uuid        not null,
  action     text        not null,
  details    text        default ''::text,
  created_at timestamptz not null default now(),
  constraint todo_activity_log_pkey primary key (id),
  constraint todo_activity_log_actor_id_fkey foreign key (actor_id)
    references public.profiles(id) on delete cascade,
  constraint todo_activity_log_todo_id_fkey foreign key (todo_id)
    references public.todos(id) on delete cascade
);

create table if not exists public.groups (
  id          uuid        not null default gen_random_uuid(),
  name        text        not null,
  description text        default ''::text,
  color       text,
  created_by  uuid,
  created_at  timestamptz not null default now(),
  constraint groups_pkey primary key (id),
  constraint groups_created_by_fkey foreign key (created_by)
    references public.profiles(id) on delete set null,
  constraint groups_name_len check (char_length(name) <= 120),
  constraint groups_desc_len check (description is null or char_length(description) <= 2000)
);

create table if not exists public.group_members (
  group_id  uuid        not null,
  member_id uuid        not null,
  added_by  uuid,
  added_at  timestamptz not null default now(),
  constraint group_members_pkey primary key (group_id, member_id),
  constraint group_members_group_id_fkey foreign key (group_id)
    references public.groups(id) on delete cascade,
  constraint group_members_member_id_fkey foreign key (member_id)
    references public.profiles(id) on delete cascade,
  constraint group_members_added_by_fkey foreign key (added_by)
    references public.profiles(id) on delete set null
);

create table if not exists public.notifications (
  id         uuid        not null default gen_random_uuid(),
  user_id    uuid        not null,
  type       text        not null default 'general'::text,
  title      text        not null,
  message    text        not null,
  target_tab text,
  related_id text,
  created_at timestamptz not null default now(),
  read_at    timestamptz,
  constraint notifications_pkey primary key (id),
  constraint notifications_user_id_fkey foreign key (user_id)
    references public.profiles(id) on delete cascade
);

create table if not exists public.monthly_leaderboard (
  id                  bigint      generated by default as identity,
  month_start         date        not null,
  first_place_id      uuid,
  first_place_name    text        not null,
  first_place_points  integer     not null default 0,
  second_place_id     uuid,
  second_place_name   text        not null,
  second_place_points integer     not null default 0,
  created_at          timestamptz not null default now(),
  constraint monthly_leaderboard_pkey primary key (id),
  constraint monthly_leaderboard_month_start_key unique (month_start),
  constraint monthly_leaderboard_first_place_id_fkey foreign key (first_place_id)
    references public.profiles(id) on delete set null,
  constraint monthly_leaderboard_second_place_id_fkey foreign key (second_place_id)
    references public.profiles(id) on delete set null
);

create table if not exists public.admin_activity_log (
  id             bigint      generated by default as identity,
  admin_id       uuid,
  action         text        not null,
  target_user_id uuid,
  details        text,
  created_at     timestamptz not null default now(),
  constraint admin_activity_log_pkey primary key (id),
  constraint admin_activity_log_admin_id_fkey foreign key (admin_id)
    references public.profiles(id) on delete set null,
  constraint admin_activity_log_target_user_id_fkey foreign key (target_user_id)
    references public.profiles(id) on delete set null
);

create table if not exists public.conversations (
  id              uuid        not null default gen_random_uuid(),
  kind            text        not null default 'direct',
  title           text,
  group_id        uuid,
  created_by      uuid,
  created_at      timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  direct_key      text,
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

-- Messaging safety & break-glass (20260916100000_messaging_breakglass.sql).
-- A participant's report OR a head-admin concern; a time-limited grant to read
-- one conversation, active only after a UNANIMOUS head-admin vote; one vote row
-- per head admin per grant. See section 3 (helpers/RPCs) and section 5 (RLS).
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

-- ----------------------------------------------------------------------------
-- 2 · SECONDARY INDEXES  (constraint-backed indexes are created above with the
--     constraints; these are the extra performance indexes.)
-- ----------------------------------------------------------------------------

create index if not exists notifications_user_created_idx
  on public.notifications using btree (user_id, created_at desc);
create index if not exists notifications_user_unread_idx
  on public.notifications using btree (user_id) where (read_at is null);
create index if not exists profiles_role_idx
  on public.profiles using btree (role);
create index if not exists role_permissions_permission_idx
  on public.role_permissions using btree (permission_key);
create index if not exists todo_activity_log_actor_id_idx
  on public.todo_activity_log using btree (actor_id);
create index if not exists todo_activity_log_created_at_idx
  on public.todo_activity_log using btree (created_at desc);
create index if not exists todo_activity_log_todo_id_idx
  on public.todo_activity_log using btree (todo_id);

-- Covering indexes for foreign keys (Phase 5D — perf advisor). One per FK
-- column so joins/cascades don't fall back to a sequential scan at scale.
-- profile_achievements.user_id is already covered by its unique
-- (user_id, achievement_id) index and is intentionally omitted.
create index if not exists idx_achievements_created_by
  on public.achievements using btree (created_by);
create index if not exists idx_admin_activity_log_admin_id
  on public.admin_activity_log using btree (admin_id);
create index if not exists idx_admin_activity_log_target_user_id
  on public.admin_activity_log using btree (target_user_id);
create index if not exists idx_monthly_leaderboard_first_place_id
  on public.monthly_leaderboard using btree (first_place_id);
create index if not exists idx_monthly_leaderboard_second_place_id
  on public.monthly_leaderboard using btree (second_place_id);
create index if not exists idx_news_published_by
  on public.news using btree (published_by);
create index if not exists idx_point_history_awarded_by
  on public.point_history using btree (awarded_by);
create index if not exists idx_point_history_member_id
  on public.point_history using btree (member_id);
create index if not exists idx_point_reset_history_reset_by
  on public.point_reset_history using btree (reset_by);
create index if not exists idx_profile_achievements_achievement_id
  on public.profile_achievements using btree (achievement_id);
create index if not exists idx_profile_achievements_awarded_by
  on public.profile_achievements using btree (awarded_by);
create index if not exists idx_role_definitions_created_by
  on public.role_definitions using btree (created_by);
create index if not exists idx_todos_assigned_to
  on public.todos using btree (assigned_to);
create index if not exists idx_todos_completed_by
  on public.todos using btree (completed_by);
create index if not exists idx_todos_created_by
  on public.todos using btree (created_by);
create index if not exists idx_groups_created_by
  on public.groups using btree (created_by);
create index if not exists idx_group_members_member_id
  on public.group_members using btree (member_id);

-- Messaging: one group room per Group (partial unique), one direct thread per
-- pair (partial unique on the canonical pair key), recency sort, and the
-- per-conversation / per-member lookups the inbox and thread views hit.
create unique index if not exists idx_conversations_group_unique
  on public.conversations (group_id)
  where kind = 'group' and group_id is not null;
create unique index if not exists idx_conversations_direct_unique
  on public.conversations (direct_key)
  where kind = 'direct' and direct_key is not null;
create index if not exists idx_conversations_last_message_at
  on public.conversations using btree (last_message_at desc);
create index if not exists idx_conversation_participants_member
  on public.conversation_participants using btree (member_id);
create index if not exists idx_messages_conversation_created
  on public.messages using btree (conversation_id, created_at);

-- Break-glass: at most one live (pending/active) grant per conversation, plus
-- the report/grant lookups the Safety-review surface and access checks hit.
create unique index if not exists idx_breakglass_grants_one_live
  on public.breakglass_grants (conversation_id)
  where status in ('pending', 'active');
create index if not exists idx_conversation_reports_conversation
  on public.conversation_reports using btree (conversation_id, status);
create index if not exists idx_breakglass_grants_conversation
  on public.breakglass_grants using btree (conversation_id, status);

-- ----------------------------------------------------------------------------
-- 3 · FUNCTIONS  (verbatim from pg_get_functiondef; helpers first so plpgsql
--     callers resolve them. All SECURITY DEFINER with a pinned search_path.)
-- ----------------------------------------------------------------------------

-- 3a · Authorization helpers -------------------------------------------------

create or replace function public.current_user_role()
  returns text
  language sql
  stable security definer
  set search_path to 'public'
as $function$
  -- Hardening (20260913000000): stable; only ACTIVE members resolve to their
  -- role, and a missing/deactivated caller coalesces to the 'guest' sentinel
  -- (never null) so every negative role guard fails safe.
  select coalesce(
    (
      select role
      from public.profiles
      where id = auth.uid()
        and is_active = true
      limit 1
    ),
    'guest'
  );
$function$;

create or replace function public.has_permission(p_permission_key text)
  returns boolean
  language sql
  stable security definer
  set search_path to 'public'
as $function$
  select exists (
    select 1
    from public.profiles p
    join public.role_permissions rp
      on rp.role_key = p.role
    where p.id = auth.uid()
      and p.is_active = true
      and rp.permission_key = p_permission_key
  );
$function$;

create or replace function public.is_head_admin()
  returns boolean
  language sql
  stable security definer
  set search_path to 'public'
as $function$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
      and p.role = 'head_admin'
  );
$function$;

create or replace function public.get_my_permissions()
  returns text[]
  language sql
  stable security definer
  set search_path to 'public'
as $function$
  select coalesce(array_agg(rp.permission_key order by rp.permission_key), '{}'::text[])
  from public.profiles p
  join public.role_permissions rp
    on rp.role_key = p.role
  where p.id = auth.uid()
    and p.is_active = true;
$function$;

create or replace function public.admin_can_modify_target(p_target_id uuid)
  returns boolean
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
declare
  caller_role text;
  target_role text;
begin
  caller_role := public.current_user_role();

  select role
  into target_role
  from public.profiles
  where id = p_target_id;

  -- Target doesn't exist.
  if target_role is null then
    return false;
  end if;

  -- Head Admin can manage all users.
  if caller_role = 'head_admin' then
    return true;
  end if;

  -- Administrator cannot modify another Head Admin.
  if caller_role = 'administrator'
     and target_role = 'head_admin' then
    return false;
  end if;

  -- Only Administrator and Head Admin can manage users.
  if caller_role in ('administrator', 'head_admin') then
    return true;
  end if;

  return false;
end;
$function$;

-- 3b · Trigger functions -----------------------------------------------------

create or replace function public.handle_new_user()
  returns trigger
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
begin
  insert into public.profiles (id, full_name, nickname, role, points)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'nickname', ''),
    'guest',
    0
  )
  on conflict (id) do nothing;

  return new;
end;
$function$;

create or replace function public.notify_admins_new_member()
  returns trigger
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
declare
  display_name text;
begin
  display_name :=
    coalesce(nullif(new.nickname, ''), nullif(new.full_name, ''), 'A new member');

  insert into public.notifications (user_id, type, title, message, target_tab, related_id)
  select
    p.id,
    'member',
    'New member request',
    display_name || ' has joined and is waiting for review.',
    'members',
    new.id
  from public.profiles p
  where p.role in ('administrator', 'head_admin')
    and p.is_active = true
    and p.id <> new.id;

  return new;
end;
$function$;

create or replace function public.notify_member_points()
  returns trigger
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
begin
  insert into public.notifications (user_id, type, title, message, target_tab, related_id)
  select
    p.id,
    'points',
    case when new.points >= 0 then 'Points awarded' else 'Points deducted' end,
    case
      when new.points >= 0 then '+' || new.points::text || ' points'
      else new.points::text || ' points'
    end
    || case when nullif(new.reason, '') is not null then ' — ' || new.reason else '' end,
    'points',
    new.id
  from public.profiles p
  where p.id = new.member_id;

  return new;
end;
$function$;

create or replace function public.notify_users_new_news()
  returns trigger
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
begin
  insert into public.notifications (user_id, type, title, message, target_tab, related_id)
  select
    p.id,
    'news',
    'New club news',
    new.title,
    'news',
    new.id
  from public.profiles p
  where p.is_active = true
    and p.id <> coalesce(new.published_by, '00000000-0000-0000-0000-000000000000'::uuid);

  return new;
end;
$function$;

create or replace function public.notify_users_new_todo()
  returns trigger
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
begin
  insert into public.notifications (user_id, type, title, message, target_tab, related_id)
  select
    p.id,
    'todo',
    'New To-Do task',
    new.title,
    'todo',
    new.id
  from public.profiles p
  where p.is_active = true
    and p.role <> 'guest'
    and p.id <> coalesce(new.created_by, '00000000-0000-0000-0000-000000000000'::uuid);

  return new;
end;
$function$;

create or replace function public.protect_profile_role_changes()
  returns trigger
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
declare
  caller_role text;
begin
  caller_role := public.current_user_role();

  -- Nothing special if the role was not changed.
  if new.role is not distinct from old.role then
    return new;
  end if;

  -- Nobody can change their own role.
  if new.id = auth.uid() then
    raise exception 'You cannot change your own role.';
  end if;

  -- Head Admin can manage every role.
  if caller_role = 'head_admin' then
    return new;
  end if;

  -- Administrators can manage guests, members, and executives.
  -- They cannot create, edit, or demote administrators or the Head Admin.
  if caller_role = 'administrator' then
    if old.role in ('administrator', 'head_admin')
       or new.role in ('administrator', 'head_admin') then
      raise exception 'Administrators cannot manage administrator roles.';
    end if;

    return new;
  end if;

  -- Everyone else is blocked from changing roles.
  raise exception 'You do not have permission to change roles.';
end;
$function$;

create or replace function public.protect_profile_self_updates()
  returns trigger
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
begin
  if new.id = auth.uid() then
    if new.role is distinct from old.role
       or new.is_active is distinct from old.is_active
       or new.created_at is distinct from old.created_at then
      raise exception 'You cannot change your role, points, account status, or creation date.';
    end if;

    -- A self points change is allowed ONLY inside a trusted point RPC, which
    -- sets the transaction-local app.admin_point_operation flag first.
    if new.points is distinct from old.points
       and coalesce(current_setting('app.admin_point_operation', true), '') <> 'true' then
      raise exception 'You cannot change your role, points, account status, or creation date.';
    end if;

    return new;
  end if;

  if not public.has_permission('manage_members') then
    raise exception 'You do not have permission to modify this profile.';
  end if;

  return new;
end;
$function$;

create or replace function public.protect_todo_member_updates()
  returns trigger
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
begin
  if public.current_user_role() in ('administrator', 'head_admin') then
    return new;
  end if;

  if new.title is distinct from old.title
     or new.description is distinct from old.description
     or new.deadline is distinct from old.deadline
     or new.created_by is distinct from old.created_by
     or new.image_url is distinct from old.image_url
     or new.assigned_to is distinct from old.assigned_to
     or new.points is distinct from old.points then
    raise exception 'Members can only update task completion status.';
  end if;

  new.updated_at := now();
  if new.completed then
    new.completed_at := coalesce(new.completed_at, now());
    new.completed_by := auth.uid();
  else
    new.completed_at := null;
    new.completed_by := null;
  end if;

  return new;
end;
$function$;

-- 3c · Notification RPCs -----------------------------------------------------

create or replace function public.create_notification(
  p_user_id uuid, p_type text, p_title text, p_message text,
  p_target_tab text default null::text, p_related_id text default null::text)
  returns void
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
begin
  insert into public.notifications (user_id, type, title, message, target_tab, related_id)
  values (p_user_id, p_type, p_title, p_message, p_target_tab, p_related_id);
end;
$function$;

create or replace function public.create_notification(
  p_user_id uuid, p_type text, p_title text, p_message text,
  p_target_tab text default null::text, p_related_id uuid default null::uuid)
  returns void
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
begin
  insert into public.notifications (user_id, type, title, message, target_tab, related_id)
  values (p_user_id, p_type, p_title, p_message, p_target_tab, p_related_id);
end;
$function$;

create or replace function public.mark_notification_read(p_notification_id uuid)
  returns void
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
begin
  update public.notifications
  set read_at = coalesce(read_at, now())
  where id = p_notification_id
    and user_id = auth.uid();
end;
$function$;

create or replace function public.mark_all_notifications_read()
  returns void
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
begin
  update public.notifications
  set read_at = coalesce(read_at, now())
  where user_id = auth.uid()
    and read_at is null;
end;
$function$;

create or replace function public.delete_own_notifications()
  returns void
  language sql
  security definer
  set search_path to 'public'
as $function$
  delete from public.notifications
  where user_id = auth.uid();
$function$;

create or replace function public.delete_all_notifications()
  returns void
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
begin
  if not exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'head_admin'
  ) then
    raise exception 'Only the head admin can clear all notifications.'
      using errcode = '42501';
  end if;

  -- The predicate is always true (id is the NOT NULL primary key), so this
  -- still clears every row — but an explicit WHERE is required: the database
  -- runs with the safe-update guard that rejects an unqualified DELETE
  -- ("DELETE requires a WHERE clause"), which silently broke the club-wide
  -- wipe while delete_own_notifications (WHERE user_id = auth.uid()) worked.
  delete from public.notifications where id is not null;
end;
$function$;

-- 3d · Points RPCs -----------------------------------------------------------

create or replace function public.award_points(p_member_id uuid, p_points integer, p_reason text)
  returns void
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
declare
  caller_role text;
  target_role text;
  current_points integer;
  new_points integer;
begin
  caller_role := public.current_user_role();

  if caller_role not in ('executive', 'administrator', 'head_admin') then
    raise exception 'You do not have permission to adjust points.';
  end if;

  -- Only administrators and head admins may adjust their own points.
  if p_member_id = auth.uid()
     and caller_role not in ('administrator', 'head_admin') then
    raise exception 'You cannot adjust your own points.';
  end if;

  if p_points = 0 then
    raise exception 'Point adjustment cannot be zero.';
  end if;

  if abs(p_points) > 100000 then
    raise exception 'Point adjustment is too large.';
  end if;

  if trim(p_reason) = '' then
    raise exception 'A reason is required.';
  end if;

  select role, points
    into target_role, current_points
    from public.profiles
   where id = p_member_id;

  if target_role is null then
    raise exception 'Member was not found.';
  end if;

  if target_role = 'guest' then
    raise exception 'Guests cannot receive point adjustments.';
  end if;

  new_points := current_points + p_points;

  if new_points < 0 then
    raise exception 'This adjustment would reduce the member below zero points.';
  end if;

  insert into public.point_history (member_id, points, reason, awarded_by)
  values (p_member_id, p_points, p_reason, auth.uid());

  -- A self-adjust (admins only, per the guard above) must pass the guarded
  -- self-points block in protect_profile_self_updates.
  if p_member_id = auth.uid() then
    perform set_config('app.admin_point_operation', 'true', true);
  end if;

  update public.profiles
     set points = new_points
   where id = p_member_id;
end;
$function$;

create or replace function public.reset_member_points(p_member_id uuid)
  returns void
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
begin
  if public.current_user_role() not in ('administrator', 'head_admin') then
    raise exception 'You do not have permission to reset points.';
  end if;

  if not exists (select 1 from public.profiles where id = p_member_id) then
    raise exception 'Member was not found.';
  end if;

  if exists (
    select 1 from public.profiles where id = p_member_id and role = 'guest'
  ) then
    raise exception 'Guests do not have points to reset.';
  end if;

  -- Resetting one's own points is allowed for admins; clear the self-points
  -- block for this transaction.
  if p_member_id = auth.uid() then
    perform set_config('app.admin_point_operation', 'true', true);
  end if;

  update public.profiles
     set points = 0
   where id = p_member_id;
end;
$function$;

create or replace function public.reset_all_points()
  returns void
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
declare
  caller_role text;
  previous_month date;
  top_one record;
  top_two record;
begin
  -- Only Admin and Head Admin can reset.
  caller_role := public.current_user_role();

  if caller_role not in ('administrator', 'head_admin') then
    raise exception 'You do not have permission to reset points.';
  end if;

  -- A reset zeroes the caller's own points too; clear the self-points block in
  -- protect_profile_self_updates for this transaction.
  perform set_config('app.admin_point_operation', 'true', true);

  -- The month being closed is the previous calendar month.
  previous_month := date_trunc('month', current_date - interval '1 month')::date;

  -- Get first and second place from the current standings.
  select id, coalesce(nickname, full_name, 'Unknown') as display_name, points
    into top_one
    from public.profiles
   where role <> 'guest' and is_active = true
   order by points desc, id
   limit 1;

  select id, coalesce(nickname, full_name, 'Unknown') as display_name, points
    into top_two
    from public.profiles
   where role <> 'guest'
     and is_active = true
     and (top_one.id is null or id <> top_one.id)
   order by points desc, id
   limit 1;

  -- Save the previous month's Top 2. Plain insert (mirrors live): month_start is
  -- unique, so a second reset in the same month would raise — there is no
  -- on-conflict idempotency guard in production.
  if top_one.id is not null and top_two.id is not null then
    insert into public.monthly_leaderboard (
      month_start, first_place_id, first_place_name, first_place_points,
      second_place_id, second_place_name, second_place_points
    )
    values (
      previous_month,
      top_one.id, top_one.display_name, top_one.points,
      top_two.id, top_two.display_name, top_two.points
    );
  end if;

  -- Keep the existing reset audit record.
  insert into public.point_reset_history (reset_by)
  values (auth.uid());

  -- Reset current scores only. point_history is NOT deleted.
  update public.profiles
     set points = 0
   where role <> 'guest';
end;
$function$;

-- 3e · Head-Admin data-wipe RPCs (each verifies head_admin server-side) ------

create or replace function public.delete_all_point_data()
  returns void
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
begin
  if public.current_user_role() <> 'head_admin' then
    raise exception 'Only the Head Admin can wipe point data.';
  end if;

  -- The wipe zeroes the caller's own points too; clear the self-points block.
  perform set_config('app.admin_point_operation', 'true', true);

  delete from public.point_history where true;

  update public.profiles
  set points = 0
  where role <> 'guest';
  -- monthly_leaderboard is intentionally NOT touched.
end;
$function$;

create or replace function public.delete_all_point_history()
  returns void
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
begin
  if public.current_user_role() <> 'head_admin' then
    raise exception 'Only the Head Admin can delete all point history.';
  end if;

  delete from public.point_history;
end;
$function$;

create or replace function public.delete_monthly_leaderboard()
  returns void
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
begin
  if public.current_user_role() <> 'head_admin' then
    raise exception 'Only the Head Admin can delete previous-month performance records.';
  end if;

  delete from public.monthly_leaderboard where true;
end;
$function$;

create or replace function public.delete_all_admin_activity_log()
  returns void
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
begin
  if public.current_user_role() <> 'head_admin' then
    raise exception 'Only the Head Admin can delete the admin activity history.';
  end if;

  delete from public.admin_activity_log where true;
end;
$function$;

-- 3f · Self-service account deletion (pure delete; no email — see Phase 4 H-1)

create or replace function public.delete_own_account()
  returns void
  language plpgsql
  security definer
  set search_path to 'public', 'auth'
as $function$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'You must be signed in to delete your account.';
  end if;

  -- Detach NO ACTION foreign keys so the auth-user delete can proceed.
  update public.news
     set published_by = null
   where published_by = v_user_id;

  update public.point_history
     set awarded_by = null
   where awarded_by = v_user_id;

  delete from public.point_reset_history
   where reset_by = v_user_id;

  -- profiles.id -> auth.users(id) ON DELETE CASCADE removes the profile + rows.
  delete from auth.users
   where id = v_user_id;

  if not found then
    raise exception 'Account deletion failed: user was not found.';
  end if;
end;
$function$;

-- Groups (20260915123500_fix_group_member_visibility_rls_recursion.sql) ------
-- is_current_user_group_member runs as owner so the group_members SELECT policy
-- can test the caller's membership WITHOUT recursively invoking that same policy
-- (the 42P17 trap). Grants live in section 6.

create or replace function public.is_current_user_group_member(target_group_id uuid)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select exists (
    select 1
    from public.group_members gm
    where gm.group_id = target_group_id
      and gm.member_id = auth.uid()
  );
$function$;

-- Messaging (20260916000000_messaging.sql) ----------------------------------
-- is_conversation_participant is the SECURITY DEFINER test every messaging read
-- policy calls; running as owner keeps the conversation_participants lookup from
-- recursively invoking that table's own SELECT policy (the 42P17 trap). The RPCs
-- below are the ONLY way to add OTHER people to a thread — the RLS write policies
-- let a member touch only their own participation row. Grants live in section 6.

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
  -- Hardening (20260919000000): a participant with use_messaging revoked
  -- (deactivated / guest / custom role without the grant) loses every read too.
  and public.has_permission('use_messaging');
$$;

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

-- 3e-bis · Messaging RLS hardening trigger functions (20260919000000).
--   messaging_require_use_permission — H2: reject any end-user write to the
--     messaging tables from an account without use_messaging. Fires in the RLS
--     insert path AND inside the SECURITY DEFINER RPCs (auth.uid() there is still
--     the caller), so deactivated / guest / unpermitted callers cannot create
--     threads or send. auth.uid() IS NULL (migrations / service_role) is skipped.
--   conversations_freeze_identity — H3: freeze created_by / kind / group_id /
--     direct_key against end-user UPDATEs so a non-creator can never seize the
--     conversation and trigger the creators-only cascade delete. title and
--     last_message_at stay writable (rename + the touch trigger keep working).
--   messages_enforce_block — M2: enforce a block on every send in a direct
--     thread, not only when the DM was first opened.
--   sync_group_member_removal — M3: when a member is removed from a Group, drop
--     their row from that Group's auto-room. The exists(groups) guard skips a
--     whole-group deletion (parent already gone; conversations.group_id is being
--     SET NULL by its own FK), matching the pre-existing behavior.
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

create or replace function public.conversations_freeze_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    -- created_by: block re-pointing to another member; allow the caller nulling
    -- their own creator rows (the delete_own_account SET NULL cascade).
    if new.created_by is distinct from old.created_by
       and not (new.created_by is null
                and old.created_by is not distinct from auth.uid()) then
      raise exception 'This conversation field cannot be changed';
    end if;
    -- kind is NOT NULL, so this only ever blocks a genuine direct<->group reflip.
    if new.kind is distinct from old.kind then
      raise exception 'This conversation field cannot be changed';
    end if;
    -- group_id: block re-pointing to a DIFFERENT group; allow the SET NULL
    -- cascade fired by deleting the linked group.
    if new.group_id is distinct from old.group_id
       and new.group_id is not null then
      raise exception 'This conversation field cannot be changed';
    end if;
    -- direct_key kept fully frozen (never nulled by a cascade), preserving DM dedupe.
    if to_jsonb(new) ? 'direct_key'
       and (to_jsonb(new) ->> 'direct_key') is distinct from (to_jsonb(old) ->> 'direct_key') then
      raise exception 'This conversation field cannot be changed';
    end if;
  end if;
  return new;
end;
$$;

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

-- 3f · Messaging safety & break-glass (20260916100000_messaging_breakglass.sql).
--     head_admin_count / can_admin_read_conversation gate the ONLY admin read
--     path; the RPCs below are the only writers of the three break-glass tables
--     and each writes an admin_activity_log row. can_admin_read_conversation is
--     referenced by the extended messaging SELECT policies in section 5.

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

  -- Hardening (20260919000000): unanimous AND never below the 3-head-admin floor.
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

-- ----------------------------------------------------------------------------
-- 4 · TRIGGERS
-- ----------------------------------------------------------------------------

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists trg_notify_admins_new_member on public.profiles;
create trigger trg_notify_admins_new_member
  after insert on public.profiles
  for each row execute function public.notify_admins_new_member();

drop trigger if exists protect_profile_roles on public.profiles;
create trigger protect_profile_roles
  before update on public.profiles
  for each row execute function public.protect_profile_role_changes();

drop trigger if exists protect_profile_self_updates on public.profiles;
create trigger protect_profile_self_updates
  before update on public.profiles
  for each row execute function public.protect_profile_self_updates();

drop trigger if exists trg_notify_member_points on public.point_history;
create trigger trg_notify_member_points
  after insert on public.point_history
  for each row execute function public.notify_member_points();

drop trigger if exists trg_notify_users_new_news on public.news;
create trigger trg_notify_users_new_news
  after insert on public.news
  for each row execute function public.notify_users_new_news();

drop trigger if exists protect_todo_member_updates on public.todos;
create trigger protect_todo_member_updates
  before update on public.todos
  for each row execute function public.protect_todo_member_updates();

drop trigger if exists trg_notify_users_new_todo on public.todos;
create trigger trg_notify_users_new_todo
  after insert on public.todos
  for each row execute function public.notify_users_new_todo();

drop trigger if exists trg_touch_conversation_last_message on public.messages;
create trigger trg_touch_conversation_last_message
  after insert on public.messages
  for each row execute function public.touch_conversation_last_message();

-- Messaging RLS hardening triggers (20260919000000).
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

drop trigger if exists trg_conversations_freeze_identity on public.conversations;
create trigger trg_conversations_freeze_identity
  before update on public.conversations
  for each row execute function public.conversations_freeze_identity();

drop trigger if exists trg_messages_enforce_block on public.messages;
create trigger trg_messages_enforce_block
  before insert on public.messages
  for each row execute function public.messages_enforce_block();

drop trigger if exists trg_sync_group_member_removal on public.group_members;
create trigger trg_sync_group_member_removal
  after delete on public.group_members
  for each row execute function public.sync_group_member_removal();

-- ----------------------------------------------------------------------------
-- 5 · ROW LEVEL SECURITY  (enable on every table, then (re)create policies)
-- ----------------------------------------------------------------------------

alter table public.achievements         enable row level security;
alter table public.admin_activity_log   enable row level security;
alter table public.monthly_leaderboard  enable row level security;
alter table public.news                 enable row level security;
alter table public.notifications        enable row level security;
alter table public.permissions          enable row level security;
alter table public.point_history        enable row level security;
alter table public.point_reset_history  enable row level security;
alter table public.profile_achievements enable row level security;
alter table public.profiles             enable row level security;
alter table public.role_definitions     enable row level security;
alter table public.role_permissions     enable row level security;
alter table public.todo_activity_log    enable row level security;
alter table public.todos                enable row level security;
alter table public.groups               enable row level security;
alter table public.group_members        enable row level security;
alter table public.conversations             enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages                  enable row level security;
alter table public.messaging_blocks          enable row level security;
alter table public.conversation_reports      enable row level security;
alter table public.breakglass_grants         enable row level security;
alter table public.breakglass_votes          enable row level security;

-- achievements ---------------------------------------------------------------
drop policy if exists "Everyone can view achievements" on public.achievements;
create policy "Everyone can view achievements" on public.achievements
  as permissive for select to authenticated using (true);

drop policy if exists "Admins can create achievements" on public.achievements;
create policy "Admins can create achievements" on public.achievements
  as permissive for insert to authenticated
  with check (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.role = any (array['administrator'::text, 'head_admin'::text])));

drop policy if exists "Admins can delete achievements" on public.achievements;
create policy "Admins can delete achievements" on public.achievements
  as permissive for delete to authenticated
  using (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.role = any (array['administrator'::text, 'head_admin'::text])));

-- admin_activity_log ---------------------------------------------------------
drop policy if exists "Admins can view activity log" on public.admin_activity_log;
create policy "Admins can view activity log" on public.admin_activity_log
  as permissive for select to authenticated
  using (current_user_role() = any (array['administrator'::text, 'head_admin'::text]));

drop policy if exists "Admins can create activity log" on public.admin_activity_log;
create policy "Admins can create activity log" on public.admin_activity_log
  as permissive for insert to authenticated
  with check (
    current_user_role() = any (array['administrator'::text, 'head_admin'::text])
    and admin_id = (select auth.uid()));

-- monthly_leaderboard --------------------------------------------------------
drop policy if exists "Authenticated users can read monthly leaderboard" on public.monthly_leaderboard;
create policy "Authenticated users can read monthly leaderboard" on public.monthly_leaderboard
  as permissive for select to authenticated using (true);

drop policy if exists "Admins can create monthly leaderboard" on public.monthly_leaderboard;
create policy "Admins can create monthly leaderboard" on public.monthly_leaderboard
  as permissive for insert to authenticated
  with check (current_user_role() = any (array['administrator'::text, 'head_admin'::text]));

-- news -----------------------------------------------------------------------
drop policy if exists "Authenticated users can read news" on public.news;
create policy "Authenticated users can read news" on public.news
  as permissive for select to authenticated using (true);

drop policy if exists "Admins can create news" on public.news;
create policy "Admins can create news" on public.news
  as permissive for insert to authenticated
  with check (current_user_role() = any (array['administrator'::text, 'head_admin'::text]));

drop policy if exists "Admins can update news" on public.news;
create policy "Admins can update news" on public.news
  as permissive for update to authenticated
  using (current_user_role() = any (array['administrator'::text, 'head_admin'::text]))
  with check (current_user_role() = any (array['administrator'::text, 'head_admin'::text]));

drop policy if exists "Admins can delete news" on public.news;
create policy "Admins can delete news" on public.news
  as permissive for delete to authenticated
  using (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.role = any (array['administrator'::text, 'head_admin'::text])));

-- notifications --------------------------------------------------------------
drop policy if exists "Users can view own notifications" on public.notifications;
create policy "Users can view own notifications" on public.notifications
  as permissive for select to authenticated using (user_id = (select auth.uid()));

-- permissions ----------------------------------------------------------------
drop policy if exists "Authenticated users can read permissions" on public.permissions;
create policy "Authenticated users can read permissions" on public.permissions
  as permissive for select to authenticated using (true);

-- point_history --------------------------------------------------------------
-- Phase 5D: the two permissive SELECT policies (own history, admin-all) are
-- merged into one. Old names dropped first so this stays re-runnable.
drop policy if exists "Users can read their own point history" on public.point_history;
drop policy if exists "Admins can read all point history" on public.point_history;
drop policy if exists "Members read own point history, admins read all" on public.point_history;
create policy "Members read own point history, admins read all" on public.point_history
  as permissive for select to authenticated
  using (
    (member_id = (select auth.uid()))
    or (current_user_role() = any (array['administrator'::text, 'head_admin'::text]))
  );

-- point_reset_history --------------------------------------------------------
drop policy if exists "Admins can read point reset history" on public.point_reset_history;
create policy "Admins can read point reset history" on public.point_reset_history
  as permissive for select to authenticated
  using (current_user_role() = any (array['administrator'::text, 'head_admin'::text]));

-- profile_achievements -------------------------------------------------------
drop policy if exists "Everyone can view profile achievements" on public.profile_achievements;
create policy "Everyone can view profile achievements" on public.profile_achievements
  as permissive for select to authenticated using (true);

drop policy if exists "Admins can award achievements" on public.profile_achievements;
create policy "Admins can award achievements" on public.profile_achievements
  as permissive for insert to authenticated
  with check (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.role = any (array['administrator'::text, 'head_admin'::text])));

drop policy if exists "Admins can remove achievements" on public.profile_achievements;
create policy "Admins can remove achievements" on public.profile_achievements
  as permissive for delete to authenticated
  using (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.role = any (array['administrator'::text, 'head_admin'::text])));

-- profiles -------------------------------------------------------------------
-- The own-row SELECT branch is intentionally UNCONDITIONAL (no is_active check):
-- a deactivated user must still be able to read their OWN row so the client can
-- detect is_active=false and sign them out (see migration
-- 20260913000000_harden_deactivation_enforcement.sql, M-1). Branches 2/3 remain
-- is_active/admin-gated, so this leaks no other user's row; the UPDATE policy
-- below still blocks a deactivated user from writing.
drop policy if exists "Controlled profile visibility" on public.profiles;
create policy "Controlled profile visibility" on public.profiles
  as permissive for select to authenticated
  using (
    ((select auth.uid()) = id)
    or ((current_user_role() <> 'guest'::text) and (role <> 'guest'::text) and (is_active = true))
    or (current_user_role() = any (array['administrator'::text, 'head_admin'::text]))
  );

-- Phase 5D: four permissive UPDATE policies (two of them identical) merged
-- into one. Old names dropped first so this stays re-runnable.
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Permission roles can update other profiles" on public.profiles;
drop policy if exists "Admins can update profiles" on public.profiles;
drop policy if exists "Admins can change account status" on public.profiles;
drop policy if exists "Update own profile or manage others" on public.profiles;
create policy "Update own profile or manage others" on public.profiles
  as permissive for update to authenticated
  using (
    admin_can_modify_target(id)
    or ((id <> (select auth.uid())) and has_permission('manage_members'::text))
    or (((select auth.uid()) = id) and (is_active = true))
  )
  with check (
    admin_can_modify_target(id)
    or ((id <> (select auth.uid())) and has_permission('manage_members'::text))
    or (((select auth.uid()) = id) and (is_active = true))
  );

-- role_definitions -----------------------------------------------------------
drop policy if exists "Authenticated users can read role definitions" on public.role_definitions;
create policy "Authenticated users can read role definitions" on public.role_definitions
  as permissive for select to authenticated using (true);

drop policy if exists "Head Admins can create role definitions" on public.role_definitions;
create policy "Head Admins can create role definitions" on public.role_definitions
  as permissive for insert to authenticated with check (is_head_admin());

drop policy if exists "Head Admins can update custom role definitions" on public.role_definitions;
create policy "Head Admins can update custom role definitions" on public.role_definitions
  as permissive for update to authenticated
  using (is_head_admin() and (is_system = false))
  with check (is_head_admin() and (is_system = false));

drop policy if exists "Head Admins can delete custom role definitions" on public.role_definitions;
create policy "Head Admins can delete custom role definitions" on public.role_definitions
  as permissive for delete to authenticated
  using (is_head_admin() and (is_system = false));

-- role_permissions -----------------------------------------------------------
drop policy if exists "Authenticated users can read role permissions" on public.role_permissions;
create policy "Authenticated users can read role permissions" on public.role_permissions
  as permissive for select to authenticated using (true);

drop policy if exists "Head Admins can create role permissions" on public.role_permissions;
create policy "Head Admins can create role permissions" on public.role_permissions
  as permissive for insert to authenticated with check (is_head_admin());

drop policy if exists "Head Admins can update role permissions" on public.role_permissions;
create policy "Head Admins can update role permissions" on public.role_permissions
  as permissive for update to authenticated
  using (is_head_admin()) with check (is_head_admin());

drop policy if exists "Head Admins can delete role permissions" on public.role_permissions;
create policy "Head Admins can delete role permissions" on public.role_permissions
  as permissive for delete to authenticated using (is_head_admin());

-- todo_activity_log ----------------------------------------------------------
drop policy if exists "todo activity read authenticated" on public.todo_activity_log;
create policy "todo activity read authenticated" on public.todo_activity_log
  as permissive for select to authenticated using (true);

drop policy if exists "todo activity insert own" on public.todo_activity_log;
create policy "todo activity insert own" on public.todo_activity_log
  as permissive for insert to authenticated with check (actor_id = (select auth.uid()));

drop policy if exists "todo activity delete admin" on public.todo_activity_log;
create policy "todo activity delete admin" on public.todo_activity_log
  as permissive for delete to authenticated
  using (exists (
    select 1 from profiles p
    where p.id = (select auth.uid())
      and p.role = any (array['administrator'::text, 'head_admin'::text])));

-- todos ----------------------------------------------------------------------
drop policy if exists "Everyone can view todos" on public.todos;
create policy "Everyone can view todos" on public.todos
  as permissive for select to authenticated using (true);

drop policy if exists "Admins can create todos" on public.todos;
create policy "Admins can create todos" on public.todos
  as permissive for insert to authenticated
  with check (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.role = any (array['administrator'::text, 'head_admin'::text])));

-- Phase 5D: "Admins can edit todos" OR "Members can complete todos" merged
-- into one. The member policy was already USING (true) WITH CHECK (true), so
-- the union is true; per-column limits for non-admins are enforced by the
-- protect_todo_member_updates trigger, not by RLS.
drop policy if exists "Admins can edit todos" on public.todos;
drop policy if exists "Members can complete todos" on public.todos;
drop policy if exists "Update todos" on public.todos;
create policy "Update todos" on public.todos
  as permissive for update to authenticated using (true) with check (true);

drop policy if exists "Admins can delete todos" on public.todos;
create policy "Admins can delete todos" on public.todos
  as permissive for delete to authenticated
  using (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.role = any (array['administrator'::text, 'head_admin'::text])));

-- groups ---------------------------------------------------------------------
-- Visibility restricted (20260915122000): admins see all groups; everyone else
-- sees only the groups they belong to. (Baseline previously shipped using(true).)
drop policy if exists "Everyone can view groups" on public.groups;
drop policy if exists "Members can view their groups" on public.groups;
create policy "Members can view their groups" on public.groups
  as permissive for select to authenticated
  using (
    exists (
      select 1 from profiles p
      where p.id = (select auth.uid())
        and p.role = any (array['administrator'::text, 'head_admin'::text]))
    or exists (
      select 1 from group_members gm
      where gm.group_id = groups.id
        and gm.member_id = (select auth.uid())));

drop policy if exists "Admins can create groups" on public.groups;
create policy "Admins can create groups" on public.groups
  as permissive for insert to authenticated
  with check (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.role = any (array['administrator'::text, 'head_admin'::text])));

drop policy if exists "Admins can edit groups" on public.groups;
create policy "Admins can edit groups" on public.groups
  as permissive for update to authenticated
  using (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.role = any (array['administrator'::text, 'head_admin'::text])))
  with check (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.role = any (array['administrator'::text, 'head_admin'::text])));

drop policy if exists "Admins can delete groups" on public.groups;
create policy "Admins can delete groups" on public.groups
  as permissive for delete to authenticated
  using (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.role = any (array['administrator'::text, 'head_admin'::text])));

-- group_members --------------------------------------------------------------
-- Visibility restricted (20260915123500): admins see all rows; everyone else
-- sees rosters only for groups they belong to, via the SECURITY DEFINER helper
-- above (inline self-subquery here would recurse — 42P17). Was using(true).
drop policy if exists "Everyone can view group members" on public.group_members;
drop policy if exists "Members can view membership for their groups" on public.group_members;
create policy "Members can view membership for their groups" on public.group_members
  as permissive for select to authenticated
  using (
    exists (
      select 1 from profiles p
      where p.id = (select auth.uid())
        and p.role = any (array['administrator'::text, 'head_admin'::text]))
    or public.is_current_user_group_member(group_members.group_id));

drop policy if exists "Admins can add group members" on public.group_members;
create policy "Admins can add group members" on public.group_members
  as permissive for insert to authenticated
  with check (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.role = any (array['administrator'::text, 'head_admin'::text])));

drop policy if exists "Admins can edit group members" on public.group_members;
create policy "Admins can edit group members" on public.group_members
  as permissive for update to authenticated
  using (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.role = any (array['administrator'::text, 'head_admin'::text])))
  with check (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.role = any (array['administrator'::text, 'head_admin'::text])));

drop policy if exists "Admins can remove group members" on public.group_members;
create policy "Admins can remove group members" on public.group_members
  as permissive for delete to authenticated
  using (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.role = any (array['administrator'::text, 'head_admin'::text])));

-- conversations --------------------------------------------------------------
-- SELECT also honours the single admin break-glass path (section 3f); the other
-- three verbs stay participant-only.
drop policy if exists "Participants can view conversations" on public.conversations;
create policy "Participants can view conversations" on public.conversations
  as permissive for select to authenticated
  using (
    public.is_conversation_participant(id)
    or public.can_admin_read_conversation(id)
  );

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
  using (
    public.is_conversation_participant(conversation_id)
    or public.can_admin_read_conversation(conversation_id)
  );

-- Hardening (20260919000000): no participant UPDATE policy. Relocating one's own
-- row to another conversation_id (the PK's other half) would have granted reads
-- of any thread; the read cursor is advanced only by the mark_conversation_read
-- SECURITY DEFINER RPC, so no end-user UPDATE of this table is legitimate.
drop policy if exists "Members can update own participation" on public.conversation_participants;

drop policy if exists "Members can leave conversations" on public.conversation_participants;
create policy "Members can leave conversations" on public.conversation_participants
  as permissive for delete to authenticated
  using (member_id = (select auth.uid()));

-- messages -------------------------------------------------------------------
drop policy if exists "Participants can view messages" on public.messages;
create policy "Participants can view messages" on public.messages
  as permissive for select to authenticated
  using (
    public.is_conversation_participant(conversation_id)
    or public.can_admin_read_conversation(conversation_id)
  );

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

-- break-glass tables ---------------------------------------------------------
-- Reads only: reporters see their own reports, head admins see the whole safety
-- queue. Every write goes through the SECURITY DEFINER RPCs in section 3f, so
-- there are deliberately NO client insert/update/delete policies here.
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
-- 6 · PRIVILEGES
--     Supabase's default model: broad table privileges to anon/authenticated/
--     service_role, with RLS (section 5) as the ACTUAL access boundary. Function
--     EXECUTE is tightened: anon can call nothing; internal trigger/helper
--     functions are service_role-only; the rest are callable by authenticated.
-- ----------------------------------------------------------------------------

grant all on all tables in schema public to anon, authenticated, service_role;

-- Functions: reset to the live grant state regardless of project defaults.
revoke execute on all functions in schema public from public;
revoke execute on all functions in schema public from anon;
grant  execute on all functions in schema public to authenticated, service_role;

-- Internal functions (trigger handlers + create_notification helper) are not
-- meant to be called directly by end users — service_role / definer only.
revoke execute on function public.handle_new_user()                 from authenticated;
revoke execute on function public.notify_admins_new_member()        from authenticated;
revoke execute on function public.notify_member_points()            from authenticated;
revoke execute on function public.notify_users_new_news()           from authenticated;
revoke execute on function public.notify_users_new_todo()           from authenticated;
revoke execute on function public.protect_profile_role_changes()    from authenticated;
revoke execute on function public.protect_profile_self_updates()    from authenticated;
revoke execute on function public.protect_todo_member_updates()     from authenticated;
revoke execute on function public.touch_conversation_last_message() from authenticated;
revoke execute on function public.messaging_require_use_permission() from authenticated;
revoke execute on function public.conversations_freeze_identity()    from authenticated;
revoke execute on function public.messages_enforce_block()           from authenticated;
revoke execute on function public.sync_group_member_removal()        from authenticated;
revoke execute on function public.create_notification(uuid, text, text, text, text, text) from authenticated;
revoke execute on function public.create_notification(uuid, text, text, text, text, uuid) from authenticated;

-- ----------------------------------------------------------------------------
-- 7 · STORAGE  (buckets + object policies)
--     Both buckets are image-only (SVG excluded — stored-XSS vector) and capped
--     at 8 MB, matching src/lib/uploadAttachment.js. (Phase 4 M-2a.)
--     Both are PRIVATE (public = false): objects are read via short-lived signed
--     URLs minted client-side (src/lib/storageImage.js), never anonymous public
--     links. The "view" SELECT policies below are what authorise that signing.
--     (Phase 4 M-2b.)
-- ----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars',     'avatars',     false, 8388608, array['image/jpeg','image/png','image/webp','image/gif']),
  ('attachments', 'attachments', false, 8388608, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- attachments: club-wide read; admins write. -------------------------------
drop policy if exists "Everyone can view attachments" on storage.objects;
create policy "Everyone can view attachments" on storage.objects
  as permissive for select to authenticated
  using (bucket_id = 'attachments'::text);

drop policy if exists "Admins can upload attachments" on storage.objects;
create policy "Admins can upload attachments" on storage.objects
  as permissive for insert to authenticated
  with check ((bucket_id = 'attachments'::text) and (exists (
    select 1 from profiles
    where profiles.id = auth.uid()
      and profiles.role = any (array['administrator'::text, 'head_admin'::text]))));

drop policy if exists "Admins can update attachments" on storage.objects;
create policy "Admins can update attachments" on storage.objects
  as permissive for update to authenticated
  using ((bucket_id = 'attachments'::text) and (exists (
    select 1 from profiles
    where profiles.id = auth.uid()
      and profiles.role = any (array['administrator'::text, 'head_admin'::text]))))
  with check ((bucket_id = 'attachments'::text) and (exists (
    select 1 from profiles
    where profiles.id = auth.uid()
      and profiles.role = any (array['administrator'::text, 'head_admin'::text]))));

drop policy if exists "Admins can delete attachments" on storage.objects;
create policy "Admins can delete attachments" on storage.objects
  as permissive for delete to authenticated
  using ((bucket_id = 'attachments'::text) and (exists (
    select 1 from profiles
    where profiles.id = auth.uid()
      and profiles.role = any (array['administrator'::text, 'head_admin'::text]))));

-- avatars: anyone signed-in can view; users manage only their own folder. ----
drop policy if exists "Users can view avatars" on storage.objects;
create policy "Users can view avatars" on storage.objects
  as permissive for select to authenticated
  using (bucket_id = 'avatars'::text);

drop policy if exists "Users can list own avatars" on storage.objects;
create policy "Users can list own avatars" on storage.objects
  as permissive for select to authenticated
  using ((bucket_id = 'avatars'::text) and ((storage.foldername(name))[1] = (auth.uid())::text));

drop policy if exists "Users can upload own avatar" on storage.objects;
create policy "Users can upload own avatar" on storage.objects
  as permissive for insert to authenticated
  with check ((bucket_id = 'avatars'::text) and ((storage.foldername(name))[1] = (auth.uid())::text));

drop policy if exists "Users can update own avatar" on storage.objects;
create policy "Users can update own avatar" on storage.objects
  as permissive for update to authenticated
  using ((bucket_id = 'avatars'::text) and ((storage.foldername(name))[1] = (auth.uid())::text))
  with check ((bucket_id = 'avatars'::text) and ((storage.foldername(name))[1] = (auth.uid())::text));

drop policy if exists "Users can delete own avatar" on storage.objects;
create policy "Users can delete own avatar" on storage.objects
  as permissive for delete to authenticated
  using ((bucket_id = 'avatars'::text) and ((storage.foldername(name))[1] = (auth.uid())::text));

-- ----------------------------------------------------------------------------
-- 8 · REALTIME PUBLICATION
--     Add our tables to the pre-existing supabase_realtime publication, guarded
--     so re-runs (and the fact that the publication already exists) are safe.
-- ----------------------------------------------------------------------------

do $$
declare
  t text;
  wanted text[] := array[
    'admin_activity_log', 'news', 'notifications', 'point_history',
    'profile_achievements', 'profiles', 'todos', 'groups', 'group_members',
    'conversations', 'conversation_participants', 'messages'
  ];
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

-- ============================================================================
-- END OF BASELINE
-- ============================================================================
