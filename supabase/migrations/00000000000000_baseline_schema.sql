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

-- Messaging: one group room per Group (partial unique), recency sort, and the
-- per-conversation / per-member lookups the inbox and thread views hit.
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
-- 3 · FUNCTIONS  (verbatim from pg_get_functiondef; helpers first so plpgsql
--     callers resolve them. All SECURITY DEFINER with a pinned search_path.)
-- ----------------------------------------------------------------------------

-- 3a · Authorization helpers -------------------------------------------------

create or replace function public.current_user_role()
  returns text
  language sql
  security definer
  set search_path to 'public'
as $function$
  select role
  from public.profiles
  where id = auth.uid()
  limit 1;
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
       or new.points is distinct from old.points
       or new.is_active is distinct from old.is_active
       or new.created_at is distinct from old.created_at then
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

  if p_member_id = auth.uid() then
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

  if p_member_id = auth.uid() then
    raise exception 'You cannot reset your own points.';
  end if;

  if not exists (select 1 from public.profiles where id = p_member_id) then
    raise exception 'Member was not found.';
  end if;

  if exists (
    select 1 from public.profiles where id = p_member_id and role = 'guest'
  ) then
    raise exception 'Guests do not have points to reset.';
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
  previous_month date;
  top_one record;
  top_two record;
begin
  -- Only Admin and Head Admin can reset.
  if public.current_user_role() not in ('administrator', 'head_admin') then
    raise exception 'You do not have permission to reset points.';
  end if;

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

  -- Save the previous month's Top 2.
  if top_one.id is not null and top_two.id is not null then
    insert into public.monthly_leaderboard (
      month_start, first_place_id, first_place_name, first_place_points,
      second_place_id, second_place_name, second_place_points
    )
    values (
      previous_month,
      top_one.id, top_one.display_name, top_one.points,
      top_two.id, top_two.display_name, top_two.points
    )
    on conflict (month_start) do update set
      first_place_id = excluded.first_place_id,
      first_place_name = excluded.first_place_name,
      first_place_points = excluded.first_place_points,
      second_place_id = excluded.second_place_id,
      second_place_name = excluded.second_place_name,
      second_place_points = excluded.second_place_points;
  end if;

  -- Keep the existing reset audit record.
  insert into public.point_reset_history (reset_by) values (auth.uid());

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
  );
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
  with check (current_user_role() = any (array['administrator'::text, 'head_admin'::text]));

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
drop policy if exists "Everyone can view groups" on public.groups;
create policy "Everyone can view groups" on public.groups
  as permissive for select to authenticated using (true);

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
drop policy if exists "Everyone can view group members" on public.group_members;
create policy "Everyone can view group members" on public.group_members
  as permissive for select to authenticated using (true);

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
