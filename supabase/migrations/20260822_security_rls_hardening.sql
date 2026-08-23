-- UU-MLC Nexus security hardening
--
-- 1. Remove implicit PUBLIC EXECUTE from SECURITY DEFINER functions.
-- 2. Expose only the authenticated-user RPCs that the frontend actually needs.
-- 3. Keep trigger-only helpers inaccessible through PostgREST.
-- 4. Prevent ordinary members from changing protected todo fields through the
--    intentionally broad completion UPDATE policy.
-- 5. Prevent users from changing their own role, points, account status, or
--    creation timestamp through the self-profile UPDATE policy.

REVOKE EXECUTE ON FUNCTION public.admin_can_modify_target(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.award_points(uuid, integer, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, text, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.current_user_role() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_all_admin_activity_log() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_all_point_data() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_all_point_history() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_monthly_leaderboard() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_my_permissions() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_permission(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_head_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mark_all_notifications_read() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mark_notification_read(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_admins_new_member() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_member_points() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_users_new_news() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_users_new_todo() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.protect_profile_role_changes() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reset_all_points() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reset_member_points(uuid) FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, text, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, text, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_admins_new_member() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_member_points() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_users_new_news() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_users_new_todo() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_profile_role_changes() FROM authenticated;

GRANT EXECUTE ON FUNCTION public.admin_can_modify_target(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_points(uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_all_admin_activity_log() TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_all_point_data() TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_all_point_history() TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_monthly_leaderboard() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_permissions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_permission(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_head_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notification_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_all_points() TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_member_points(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.protect_todo_member_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  if public.current_user_role() in ('administrator', 'head_admin') then
    return new;
  end if;

  if new.title is distinct from old.title
     or new.description is distinct from old.description
     or new.deadline is distinct from old.deadline
     or new.created_by is distinct from old.created_by
     or new.image_url is distinct from old.image_url
     or new.assigned_to is distinct from old.assigned_to then
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

REVOKE EXECUTE ON FUNCTION public.protect_todo_member_updates() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS protect_todo_member_updates ON public.todos;
CREATE TRIGGER protect_todo_member_updates
BEFORE UPDATE ON public.todos
FOR EACH ROW
EXECUTE FUNCTION public.protect_todo_member_updates();

CREATE OR REPLACE FUNCTION public.protect_profile_self_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  if public.current_user_role() not in ('administrator', 'head_admin') then
    raise exception 'You do not have permission to modify this profile.';
  end if;

  return new;
end;
$function$;

REVOKE EXECUTE ON FUNCTION public.protect_profile_self_updates() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS protect_profile_self_updates ON public.profiles;
CREATE TRIGGER protect_profile_self_updates
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_self_updates();
