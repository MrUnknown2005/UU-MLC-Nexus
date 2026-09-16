-- Allow Administrators and Head Admins to change their own points.
--
-- Normal profile self-edit protection remains intact: users cannot change
-- their own role, account status, or creation date. Point changes are allowed
-- for administrator/head_admin only through the trusted point-management RPCs.

-- -----------------------------------------------------------------------------
-- 1. award_points(): remove the self-target block for administrator/head_admin.
--    The RPC already authorizes only executive/administrator/head_admin; this
--    migration intentionally keeps administrator/head_admin as the roles that
--    may self-adjust their points. Executives may still adjust other members.
-- -----------------------------------------------------------------------------
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

  -- Executives and above can adjust points.
  if caller_role not in ('executive', 'administrator', 'head_admin') then
    raise exception 'You do not have permission to adjust points.';
  end if;

  -- Self point changes are permitted only for administrators and head admins.
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

  -- The profile trigger must distinguish this trusted server-side operation
  -- from an ordinary client self-edit when the target is the caller.
  if p_member_id = auth.uid() then
    perform set_config('app.admin_point_operation', 'true', true);
  end if;

  update public.profiles
     set points = new_points
   where id = p_member_id;
end;
$function$;

-- -----------------------------------------------------------------------------
-- 2. reset_member_points(): allow administrator/head_admin to reset themselves.
-- -----------------------------------------------------------------------------
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

  -- The caller is authorized above. If they are resetting their own points,
  -- mark this transaction as a trusted administrative point operation so the
  -- profile self-update trigger permits only the points column to change.
  if p_member_id = auth.uid() then
    perform set_config('app.admin_point_operation', 'true', true);
  end if;

  update public.profiles
     set points = 0
   where id = p_member_id;
end;
$function$;
