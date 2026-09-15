-- ============================================================================
-- 20260914000000_groups.sql
--
-- Groups feature — assign members to groups and track task-completion credit
-- per member and per group.
--
-- CONTEXT
--   The app already lets admins create tasks (public.todos) that members mark
--   complete. This migration adds:
--     1. A per-task point value (todos.points) an admin sets on each task.
--     2. Named groups, and a many-to-many membership join, so a person can
--        belong to several groups at once.
--
--   All standings (per-member completions/points, per-group roll-ups) are
--   derived CLIENT-SIDE in Groups.jsx from public.todos + public.group_members.
--   Deliberately no stored counters, triggers, RPCs, or views: nothing here can
--   drift out of sync with the source-of-truth rows, and there is no derived
--   state to migrate later.
--
--   "Task points" are their own metric, summed live from todos.points over a
--   member's completed tasks. They are NOT written into profiles.points — that
--   leaderboard stays admin-awarded only (award_points forbids self-award to
--   stop gaming, and completing your own task would be exactly that).
--
-- IDEMPOTENT
--   Safe to run more than once: add-column IF NOT EXISTS, guarded constraint,
--   create-or-replace function, create table IF NOT EXISTS, drop-policy-before-
--   create, and a guarded realtime publication loop.
--
-- APPLY
--   Run on the next Supabase reconnect, alongside any other pending migration.
--   Until it is applied, Groups.jsx degrades gracefully to a "not set up yet"
--   empty state.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1 · todos.points — the per-task value an admin assigns.
-- ----------------------------------------------------------------------------
alter table public.todos
  add column if not exists points integer not null default 0;

-- Non-negative guard, added only if it isn't already present.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'todos_points_nonneg'
  ) then
    alter table public.todos
      add constraint todos_points_nonneg check (points >= 0);
  end if;
end$$;

-- ----------------------------------------------------------------------------
-- 2 · Harden the member-update trigger to cover the new column.
--     protect_todo_member_updates() locks every column a non-admin must not
--     touch. Without `points` in the lock a member could rewrite a task's point
--     value on completion; add it so members stay limited to completion status.
--     (Verbatim copy of the baseline function plus the one new guard line.)
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 3 · groups + group_members tables.
-- ----------------------------------------------------------------------------
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

create index if not exists idx_groups_created_by
  on public.groups using btree (created_by);
create index if not exists idx_group_members_member_id
  on public.group_members using btree (member_id);

-- ----------------------------------------------------------------------------
-- 4 · Privileges — same broad-grant + RLS-as-boundary model as every other
--     table in the baseline.
-- ----------------------------------------------------------------------------
grant all on table public.groups         to anon, authenticated, service_role;
grant all on table public.group_members  to anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 5 · RLS — everyone views, admins manage (copies the todos pattern exactly).
--     Admin write is gated on the profiles role, aligned with the client-side
--     `manage_groups` permission (administrator + head_admin).
-- ----------------------------------------------------------------------------
alter table public.groups        enable row level security;
alter table public.group_members enable row level security;

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

-- ----------------------------------------------------------------------------
-- 6 · Realtime — publish both tables so standings update live.
-- ----------------------------------------------------------------------------
do $$
declare
  t text;
  wanted text[] := array['groups', 'group_members'];
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
-- END OF 20260914000000_groups.sql
-- ============================================================================
