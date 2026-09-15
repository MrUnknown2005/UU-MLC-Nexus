-- ============================================================================
-- Enable Groups management for administrator roles.
--
-- The Groups UI already gates creation/edit/delete on the `manage_groups`
-- permission. The permission was present in the application catalogue, but the
-- live RBAC data did not contain the permission row or the administrator role
-- assignments, so administrators fell through to the read-only Groups view.
--
-- Idempotent: safe to run more than once.
-- ============================================================================

insert into public.permissions (permission_key, name, description, category)
values (
  'manage_groups',
  'Manage Groups',
  'Create groups, assign members, and set the point value of tasks.',
  'Members'
)
on conflict (permission_key) do update
set name = excluded.name,
    description = excluded.description,
    category = excluded.category;

insert into public.role_permissions (role_key, permission_key)
select role_key, 'manage_groups'
from public.role_definitions
where role_key in ('administrator', 'head_admin')
on conflict (role_key, permission_key) do nothing;

-- ============================================================================
-- END
-- ============================================================================
