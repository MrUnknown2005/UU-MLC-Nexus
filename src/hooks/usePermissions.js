import { useEffect, useState } from "react";
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
    } else {
      setPermissions(LEGACY_ROLE_PERMISSIONS[profile.role] || []);
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
    // Intentional fetch, re-run when the signed-in profile or its role changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRoleAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
