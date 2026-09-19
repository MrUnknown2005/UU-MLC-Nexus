-- ============================================================================
-- 20260919010000_audit_log_pin_admin_id.sql
--
-- LOW-severity hardening from the 2026-09-19 full-repo security sweep.
--
-- The admin_activity_log INSERT policy ("Admins can create activity log")
-- authorised any administrator / head_admin to insert an audit row but never
-- constrained admin_id, so a privileged user posting directly through PostgREST
-- could forge a log entry under a *different* admin's id (or a null id) and
-- misattribute or anonymise their own action — defeating the point of an audit
-- trail. FIX: pin admin_id = auth.uid() in the with-check.
--
-- Safe for the break-glass RPCs: those inserts run inside SECURITY DEFINER
-- functions owned by `postgres`, which bypass RLS on their owner's tables (no
-- FORCE ROW LEVEL SECURITY here), so this policy constrains only direct
-- `authenticated` client writes. Every legitimate client insert already goes
-- through useAdminAudit -> logAdminAction, which always sends admin_id =
-- profile.id (= the caller's auth.uid()), so no application path breaks.
--
-- Inert + idempotent: drop-if-exists then recreate. No data change.
-- ============================================================================

drop policy if exists "Admins can create activity log" on public.admin_activity_log;
create policy "Admins can create activity log" on public.admin_activity_log
  as permissive for insert to authenticated
  with check (
    current_user_role() = any (array['administrator'::text, 'head_admin'::text])
    and admin_id = (select auth.uid())
  );
