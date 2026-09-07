-- Notification clearing RPCs
--
-- Two SECURITY DEFINER functions, mirroring the mark_notification_read /
-- mark_all_notifications_read pattern: notification mutations run through RPCs
-- because direct table writes are gated by RLS.
--
--   delete_own_notifications()  — any signed-in member wipes their own bell.
--   delete_all_notifications()  — head admin only; wipes notifications for the
--                                 whole club. Guarded by a role check so a
--                                 non-head-admin calling it directly is refused.
--
-- Apply this in the Supabase SQL editor (the repo has no migration runner).

-- Any signed-in member may clear their own notifications.
create or replace function public.delete_own_notifications()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.notifications
  where user_id = auth.uid();
$$;

revoke all on function public.delete_own_notifications() from public;
grant execute on function public.delete_own_notifications() to authenticated;

-- Head admin only: clear notifications for every member.
create or replace function public.delete_all_notifications()
returns void
language plpgsql
security definer
set search_path = public
as $$
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

  delete from public.notifications;
end;
$$;

revoke all on function public.delete_all_notifications() from public;
grant execute on function public.delete_all_notifications() to authenticated;
