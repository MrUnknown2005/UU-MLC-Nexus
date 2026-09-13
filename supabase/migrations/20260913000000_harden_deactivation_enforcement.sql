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
