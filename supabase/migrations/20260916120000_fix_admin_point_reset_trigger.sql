-- Fix admin leaderboard reset being blocked by the self-update protection trigger.
--
-- reset_all_points() is a SECURITY DEFINER administrative RPC that intentionally
-- updates every non-guest profile, including the calling administrator's own
-- points. The profile trigger previously treated that legitimate RPC update as
-- an ordinary self-edit and raised:
--   You cannot change your role, points, account status, or creation date.
--
-- Keep normal self-update protection intact. Trusted point-management RPCs set
-- a transaction-local flag so the trigger can distinguish an authorized server
-- operation from a client-side profile edit.

-- -----------------------------------------------------------------------------
-- 1. Harden the profile trigger with a narrowly-scoped reset/point-operation
--    bypass. Role, account-status and creation-date changes remain prohibited
--    for the caller's own profile even during the trusted operation.
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 2. Recreate reset_all_points() with the transaction-local trusted-operation
--    flag. Authorization remains server-side and unchanged.
-- -----------------------------------------------------------------------------
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
  caller_role := public.current_user_role();

  if caller_role not in ('administrator', 'head_admin') then
    raise exception 'You do not have permission to reset points.';
  end if;

  -- Only this transaction can bypass the self-point protection trigger.
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
    );
  end if;

  insert into public.point_reset_history (reset_by)
  values (auth.uid());

  -- Reset current scores only. point_history is NOT deleted.
  update public.profiles
     set points = 0
   where role <> 'guest';
end;
$function$;

-- -----------------------------------------------------------------------------
-- 3. Apply the same fix to the existing Head-Admin point-data wipe RPC so it
--    does not hit the same trigger when it resets the administrator's points.
-- -----------------------------------------------------------------------------
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

  perform set_config('app.admin_point_operation', 'true', true);

  delete from public.point_history where true;

  update public.profiles
     set points = 0
   where role <> 'guest';
  -- monthly_leaderboard is intentionally NOT touched.
end;
$function$;
