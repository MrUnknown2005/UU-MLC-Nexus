-- ============================================================================
-- Phase 5D — Performance advisor remediation
-- ============================================================================
-- Clears every finding from the Supabase performance advisor as of 2026-09-08:
--
--   * unindexed_foreign_keys (15)      -> add a covering index per FK column
--   * auth_rls_initplan (15)           -> wrap auth.uid() in (select auth.uid())
--                                         so it is evaluated once per query
--                                         (initplan) instead of once per row
--   * multiple_permissive_policies (3) -> merge the OR-equivalent permissive
--                                         policies into one policy per action
--   * unused_index (2)                 -> KEPT, see note at the end
--
-- Semantics are preserved exactly. The initplan change is a pure evaluation
-- optimisation. Permissive policies for the same role+action are OR'd by
-- Postgres, so merging their USING/WITH CHECK clauses with OR yields identical
-- access. Every source policy being merged already had USING == WITH CHECK,
-- so the merged policy uses the same expression for both.
--
-- Wrapped in a single transaction: RLS is never left half-rewritten (and thus
-- never briefly open) if any statement fails.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1 · Covering indexes for unindexed foreign keys
-- ----------------------------------------------------------------------------
-- profile_achievements.user_id is already covered by the unique
-- (user_id, achievement_id) index, so it is intentionally absent here.

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

-- ----------------------------------------------------------------------------
-- 2 · auth_rls_initplan — wrap auth.uid() so it evaluates once per query
-- ----------------------------------------------------------------------------
-- Policies whose only issue is the per-row auth.uid() call. Recreated verbatim
-- with auth.uid() -> (select auth.uid()); nothing else changes. (Policies that
-- are also part of a consolidation below are handled there instead.)

-- notifications
drop policy if exists "Users can view own notifications" on public.notifications;
create policy "Users can view own notifications" on public.notifications
  as permissive for select to authenticated
  using (user_id = (select auth.uid()));

-- achievements
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

-- profile_achievements
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

-- news
drop policy if exists "Admins can delete news" on public.news;
create policy "Admins can delete news" on public.news
  as permissive for delete to authenticated
  using (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.role = any (array['administrator'::text, 'head_admin'::text])));

-- todo_activity_log
drop policy if exists "todo activity insert own" on public.todo_activity_log;
create policy "todo activity insert own" on public.todo_activity_log
  as permissive for insert to authenticated
  with check (actor_id = (select auth.uid()));

drop policy if exists "todo activity delete admin" on public.todo_activity_log;
create policy "todo activity delete admin" on public.todo_activity_log
  as permissive for delete to authenticated
  using (exists (
    select 1 from profiles p
    where p.id = (select auth.uid())
      and p.role = any (array['administrator'::text, 'head_admin'::text])));

-- todos (INSERT + DELETE; the UPDATE policy is merged in section 3)
drop policy if exists "Admins can create todos" on public.todos;
create policy "Admins can create todos" on public.todos
  as permissive for insert to authenticated
  with check (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.role = any (array['administrator'::text, 'head_admin'::text])));

drop policy if exists "Admins can delete todos" on public.todos;
create policy "Admins can delete todos" on public.todos
  as permissive for delete to authenticated
  using (exists (
    select 1 from profiles
    where profiles.id = (select auth.uid())
      and profiles.role = any (array['administrator'::text, 'head_admin'::text])));

-- profiles SELECT (single SELECT policy; only the initplan rewrite applies)
drop policy if exists "Controlled profile visibility" on public.profiles;
create policy "Controlled profile visibility" on public.profiles
  as permissive for select to authenticated
  using (
    (((select auth.uid()) = id) and (is_active = true))
    or ((current_user_role() <> 'guest'::text) and (role <> 'guest'::text) and (is_active = true))
    or (current_user_role() = any (array['administrator'::text, 'head_admin'::text]))
  );

-- ----------------------------------------------------------------------------
-- 3 · multiple_permissive_policies — one policy per role+action
-- ----------------------------------------------------------------------------

-- point_history SELECT: "Users can read their own" OR "Admins can read all".
drop policy if exists "Users can read their own point history" on public.point_history;
drop policy if exists "Admins can read all point history" on public.point_history;
create policy "Members read own point history, admins read all" on public.point_history
  as permissive for select to authenticated
  using (
    (member_id = (select auth.uid()))
    or (current_user_role() = any (array['administrator'::text, 'head_admin'::text]))
  );

-- profiles UPDATE: four permissive policies, two of which ("Admins can update
-- profiles" and "Admins can change account status") were identical. Merged to
-- the OR of the three distinct conditions.
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Permission roles can update other profiles" on public.profiles;
drop policy if exists "Admins can update profiles" on public.profiles;
drop policy if exists "Admins can change account status" on public.profiles;
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

-- todos UPDATE: "Admins can edit todos" OR "Members can complete todos". The
-- member policy was already USING (true) WITH CHECK (true), so the union is
-- simply true. Column-level limits for non-admins are enforced by the
-- protect_todo_member_updates BEFORE UPDATE trigger, not by RLS — this merge
-- does not change that.
drop policy if exists "Admins can edit todos" on public.todos;
drop policy if exists "Members can complete todos" on public.todos;
create policy "Update todos" on public.todos
  as permissive for update to authenticated
  using (true)
  with check (true);

-- ----------------------------------------------------------------------------
-- 4 · unused_index — decision: KEEP
-- ----------------------------------------------------------------------------
-- The advisor flags two indexes as never-used:
--   * todo_activity_log_created_at_idx  (created_at desc)
--   * role_permissions_permission_idx   (permission_key)
-- Both are "unused" only because this pre-launch database has almost no rows
-- and no production traffic yet. They back real access patterns — ordering the
-- activity feed by recency, and reverse "which roles hold permission X" lookups
-- (permission_key is not the leading column of the composite PK, so the PK
-- can't serve those). Their write/storage cost on these tiny tables is
-- negligible. Dropping them now would be premature; kept deliberately.

commit;
