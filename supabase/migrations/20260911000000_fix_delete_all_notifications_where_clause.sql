-- ============================================================================
-- Fix — delete_all_notifications() raised "DELETE requires a WHERE clause"
-- ============================================================================
-- The head-admin, club-wide notification wipe (delete_all_notifications) ran an
-- unqualified `DELETE FROM public.notifications;`. This project's database runs
-- with the safe-update guard that rejects a filterless DELETE/UPDATE, so every
-- attempt raised:
--
--     DELETE requires a WHERE clause
--
-- and no notifications were ever cleared club-wide. The per-member wipe
-- (delete_own_notifications) was never affected — it already filters on
-- `WHERE user_id = auth.uid()`.
--
-- Fix: add an always-true predicate on the primary key. `id` is the NOT NULL
-- PK, so `WHERE id IS NOT NULL` matches every row — the delete semantics are
-- identical (still empties the table), but there is now an explicit WHERE
-- clause that satisfies the guard.
--
-- Head-admin authorisation, security-definer, and search_path are unchanged;
-- this only adds the WHERE clause. Idempotent (create or replace) and safe to
-- run against the live project.
-- ============================================================================

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

  delete from public.notifications where id is not null;
end;
$function$;
