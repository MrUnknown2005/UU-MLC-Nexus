import { useEffect, useState } from "react";
import { usePermissions } from "./usePermissions";
import { useAdminAudit } from "./useAdminAudit";
import { useDashboardData } from "./useDashboardData";
import { useTodoBadges } from "./useTodoBadges";
import { useNotifications } from "./useNotifications";
import { useMemberActions } from "./useMemberActions";

/**
 * Composes the dashboard's feature hooks into the single API the Dashboard
 * component and its pages consume. Each concern lives in its own hook:
 *
 *   usePermissions    - role & permission flags (canViewMembers, isAdmin, ...)
 *   useAdminAudit     - writes to the admin activity log
 *   useDashboardData  - members / news / point history / activity log data
 *   useTodoBadges     - overdue-todo sidebar badge count
 *   useNotifications  - notification bell state & actions
 *   useMemberActions  - role changes, point adjustments, resets, wipes
 *
 * This file only owns tab/sidebar UI state and the small pieces of derived
 * data (rankedMembers, currentRank, recentNewsCount) that combine values
 * from more than one of the hooks above.
 */
export function useDashboardController({ profile, reloadProfile, onLogout }) {
  const [tab, setTab] = useState(
    () => localStorage.getItem("uu-mlc-active-tab") || "overview",
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("uu-mlc-active-tab", tab);
    // Intentional: closing the mobile sidebar whenever the tab changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSidebarOpen(false);
  }, [tab]);

  const {
    roleDefinitions,
    hasPermission,
    canManageMembers,
    canManageTodos,
    canViewMembers,
    canAwardPoints,
    canViewPoints,
    canViewHistory,
    canManageNews,
    canManageRoles,
    isAdmin,
    isHeadAdmin,
    loadRoleAccess,
  } = usePermissions(profile);

  const { logAdminAction } = useAdminAudit(profile);

  const {
    members,
    news,
    pointHistory,
    allPointHistory,
    previousMonth,
    activityLog,
    loadData,
  } = useDashboardData({ profile, canViewMembers, canViewHistory, isAdmin });

  const { overdueTodoCount } = useTodoBadges(profile);

  const {
    notifications,
    notificationsOpen,
    setNotificationsOpen,
    unreadNotificationCount,
    markAllNotificationsRead,
    openNotification,
  } = useNotifications({ profile, setTab });

  const {
    adjustPoints,
    changeRole,
    toggleMemberActive,
    resetAllPoints,
    resetMemberPoints,
    deleteAllPointData,
    deleteMonthlyLeaderboard,
    deleteAdminActivityLog,
  } = useMemberActions({
    profile,
    members,
    roleDefinitions,
    canManageMembers,
    canAwardPoints,
    isHeadAdmin,
    hasPermission,
    logAdminAction,
    loadData,
    reloadProfile,
  });

  /*
  =========================================================
  DERIVED VALUES (combine more than one hook's data)
  =========================================================
  */

  const rankedMembers = members.filter(
    (member) => member.role !== "guest" && member.is_active !== false,
  );

  const currentRank =
    rankedMembers.findIndex((member) => member.id === profile.id) + 1;

  const pendingMemberCount = members.filter(
    (member) => member.role === "guest" && member.is_active !== false,
  ).length;

  // "Now" is read once on mount into state rather than called directly during
  // render, so the render itself stays a pure function of props/state.
  const [nowSnapshot] = useState(() => Date.now());

  const recentNewsCount = news.filter(
    (item) =>
      item.created_at &&
      nowSnapshot - new Date(item.created_at).getTime() <
        7 * 24 * 60 * 60 * 1000,
  ).length;

  return {
    tab,
    setTab,
    sidebarOpen,
    setSidebarOpen,
    notificationsOpen,
    setNotificationsOpen,
    notifications,
    unreadNotificationCount,
    markAllNotificationsRead,
    openNotification,
    pendingMemberCount,
    overdueTodoCount,
    recentNewsCount,
    profile,
    onLogout,
    members,
    rankedMembers,
    news,
    currentRank,
    pointHistory,
    previousMonth,
    canViewMembers,
    canManageMembers,
    canViewPoints,
    canViewHistory,
    canManageNews,
    canManageRoles,
    isAdmin,
    roleDefinitions,
    changeRole,
    toggleMemberActive,
    adjustPoints,
    canAwardPoints,
    isHeadAdmin,
    allPointHistory,
    deleteAllPointData,
    deleteMonthlyLeaderboard,
    hasPermission,
    resetAllPoints,
    resetMemberPoints,
    activityLog,
    deleteAdminActivityLog,
    loadData,
    logAdminAction,
    loadRoleAccess,
    canManageTodos,
  };
}

export default useDashboardController;
