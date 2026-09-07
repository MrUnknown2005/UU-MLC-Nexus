import { useEffect, useRef, useState } from "react";
import { loadRoleAccess as loadRoleAccessService } from "../services/permissionService";
import { LEGACY_ROLE_PERMISSIONS, SYSTEM_ROLE_DEFINITIONS } from "../constants/roles";

/**
 * Loads the signed-in member's permission set and role definitions through
 * the permission service, keeping Supabase access out of the UI hook.
 */
export function usePermissions(profile) {
  const [permissions, setPermissions] = useState(
    LEGACY_ROLE_PERMISSIONS[profile.role] || [],
  );
  const [roleDefinitions, setRoleDefinitions] = useState(
    SYSTEM_ROLE_DEFINITIONS,
  );

  // True once a real permission set has loaded from the server for the current
  // identity. Gates the fail-closed fallback in loadRoleAccess below.
  const hydrated = useRef(false);

  const isHeadAdmin = profile.role === "head_admin";

  const hasPermission = (permissionKey) => permissions.includes(permissionKey);

  const canManageMembers = hasPermission("manage_members");
  const canManageTodos = hasPermission("manage_todos");
  const canViewMembers = hasPermission("view_members") || canManageMembers;
  const canAwardPoints = hasPermission("award_points");
  const canViewPoints = hasPermission("view_points") || canAwardPoints;
  const canViewHistory = hasPermission("view_history");
  const canViewAnalytics = hasPermission("view_analytics");
  const canManageNews = hasPermission("manage_news");
  const canManageRoles = hasPermission("manage_roles");

  const isAdmin =
    hasPermission("view_admin") ||
    canViewMembers ||
    canViewHistory ||
    canViewAnalytics ||
    canManageNews ||
    canManageRoles;

  const loadRoleAccess = async () => {
    const [permissionResult, roleResult] = await loadRoleAccessService();

    if (!permissionResult.error && Array.isArray(permissionResult.data)) {
      setPermissions(permissionResult.data);
      hydrated.current = true;
    } else {
      // Fail CLOSED. LEGACY_ROLE_PERMISSIONS is only an optimistic seed for the
      // first paint — for the five system roles it is the *maximal* set
      // (head_admin => every permission), so re-applying it on an RPC error or a
      // null payload would silently restore permissions an admin deliberately
      // removed server-side. If a real set already loaded this session, keep it
      // (the narrowing stands); if one never loaded, drop to no permissions
      // rather than widening. Server-side RLS is the authority (Phase 4).
      if (!hydrated.current) {
        setPermissions([]);
      }
      if (permissionResult.error) {
        console.warn(
          "Permission load fallback:",
          permissionResult.error.message,
        );
      }
    }

    if (!roleResult.error && roleResult.data?.length) {
      setRoleDefinitions(roleResult.data);
    } else {
      setRoleDefinitions(SYSTEM_ROLE_DEFINITIONS);
      if (roleResult.error) {
        console.warn(
          "Role definition load fallback:",
          roleResult.error.message,
        );
      }
    }
  };

  useEffect(() => {
    // A new identity or role must be re-derived from the server; forget any
    // previously-good set so a failed reload can't leave stale permissions.
    hydrated.current = false;
    // Intentional fetch, re-run when the signed-in profile or its role changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRoleAccess();
  }, [profile.id, profile.role]);

  return {
    permissions,
    roleDefinitions,
    hasPermission,
    canManageMembers,
    canManageTodos,
    canViewMembers,
    canAwardPoints,
    canViewPoints,
    canViewHistory,
    canViewAnalytics,
    canManageNews,
    canManageRoles,
    isAdmin,
    isHeadAdmin,
    loadRoleAccess,
  };
}

export default usePermissions;
