import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { LEGACY_ROLE_PERMISSIONS, SYSTEM_ROLE_DEFINITIONS } from "../constants/roles";

/**
 * Loads the signed-in member's permission set and the list of available
 * role definitions, and derives the boolean permission flags the rest of
 * the dashboard reads (canViewMembers, canManageNews, isAdmin, etc.).
 *
 * Falls back to the hard-coded LEGACY_ROLE_PERMISSIONS / SYSTEM_ROLE_DEFINITIONS
 * if the Supabase RPC calls fail, so the app stays usable even if the
 * permission tables are unreachable.
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
    const [permissionResult, roleResult] = await Promise.all([
      supabase.rpc("get_my_permissions"),
      supabase
        .from("role_definitions")
        .select("role_key, name, description, is_system")
        .order("name", { ascending: true }),
    ]);

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
