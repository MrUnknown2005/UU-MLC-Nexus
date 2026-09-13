-- Phase 6 · Enforce member deactivation at the database layer
-- ---------------------------------------------------------------------------
-- Context: "instant deactivation" (setting profiles.is_active = false) was only
-- enforced in the client (session revalidation). At the DB layer a deactivated
-- privileged user holding a still-valid JWT could keep calling privileged RPCs,
-- because current_user_role() returned their role with NO is_active check —
-- unlike its siblings has_permission() and is_head_admin(), which both filter
-- is_active = true.
--
-- H-1: current_user_role() ignored is_active.
-- H-2: the head-admin wipe RPCs gated on current_user_role() <> 'head_admin'
--      (a NEGATIVE string comparison) instead of the is_active-aware
--      is_head_admin().
-- M-1: the profiles SELECT policy's own-row branch required is_active = true.
--      Once H-1 makes current_user_role() return 'guest' for a deactivated user,
--      NO ONE — member or admin — can read their own profile row, so the client
--      (App.jsx getCurrentProfile -> .single()) gets a PGRST116 "no rows" error
--      instead of a row with is_active=false. The "you've been deactivated"
--      sign-out therefore never fires (revalidate() swallows the error; a full
--      reload shows the misleading "No profile yet" screen). Fixed below by
--      making the own-row branch UNCONDITIONAL: a user may always read their OWN
--      row (and only their own — the other branches are unchanged), which is
--      exactly what the client needs to detect deactivation and sign out. This
--      opens no cross-user read, and writes stay blocked (the UPDATE policy's
--      own-row branch is still is_active-gated). H-1 and M-1 must be applied
--      together — H-1 alone regresses deactivation-detection for admins.
--
-- Fix strategy for H-1: return a DOWNGRADED 'guest' sentinel (never NULL) for a
-- deactivated or missing profile. Every caller is then fail-SAFE:
--   * negative guards  ( `not in (...)`, `<> 'head_admin'` ) -> raise / deny
--   * positive guards  ( `= 'head_admin'`, `= any(array[...])` ) -> no match -> deny
-- Returning NULL instead would make the negative guards fail OPEN
-- (`NULL <> 'head_admin'` is NULL, so the `raise` is skipped), so the sentinel
-- is deliberate. Active users are completely unaffected: they still get their
-- real role. Also marked STABLE to match has_permission()/is_head_admin() and
-- avoid per-row re-evaluation inside RLS policies.

create or replace function public.current_user_role()
  returns text
  language sql
  stable security definer
  set search_path to 'public'
as $function$
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

-- H-2: gate the four head-admin data-wipe RPCs on the is_active-aware
-- is_head_admin() rather than a raw role-string comparison. (With the
-- current_user_role() fix above these are already fail-safe, but switching to
-- is_head_admin() is more robust and self-documenting — defense in depth.)

create or replace function public.delete_all_point_data()
  returns void
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
begin
  if not public.is_head_admin() then
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
  if not public.is_head_admin() then
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
  if not public.is_head_admin() then
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
  if not public.is_head_admin() then
    raise exception 'Only the Head Admin can delete the admin activity history.';
  end if;

  delete from public.admin_activity_log where true;
end;
$function$;

-- M-1: make the profiles SELECT own-row branch unconditional so a deactivated
-- user can still read their OWN row (and only their own) and the client can
-- detect is_active=false. Branches 2 and 3 are unchanged, so no deactivated user
-- can read anyone else's row; the UPDATE policy is untouched, so they still
-- cannot write. Active users are unaffected (the dropped `is_active = true` was
-- always true for them on the own-row branch).
drop policy if exists "Controlled profile visibility" on public.profiles;
create policy "Controlled profile visibility" on public.profiles
  as permissive for select to authenticated
  using (
    ((select auth.uid()) = id)
    or ((current_user_role() <> 'guest'::text) and (role <> 'guest'::text) and (is_active = true))
    or (current_user_role() = any (array['administrator'::text, 'head_admin'::text]))
  );
