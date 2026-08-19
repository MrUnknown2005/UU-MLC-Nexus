import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { LEGACY_ROLE_PERMISSIONS, SYSTEM_ROLE_DEFINITIONS } from "../constants/roles";
import { getRoleDisplayName } from "../lib/roleHelpers";

export function useDashboardController({ profile, reloadProfile, onLogout }) {

  const [tab, setTab] = useState(
    () => localStorage.getItem("uu-mlc-active-tab") || "overview",
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [todosForBadge, setTodosForBadge] = useState([]);

  const [members, setMembers] = useState([]);

  const [news, setNews] = useState([]);

  const [pointHistory, setPointHistory] = useState([]);

  const [allPointHistory, setAllPointHistory] = useState([]);

  const [previousMonth, setPreviousMonth] = useState(null);

  const [activityLog, setActivityLog] = useState([]);

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
  const canManageNews = hasPermission("manage_news");
  const canManageRoles = hasPermission("manage_roles");
  const isAdmin =
    hasPermission("view_admin") ||
    canViewMembers ||
    canViewHistory ||
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
    loadRoleAccess();
  }, [profile.id, profile.role]);

  /*
  =========================================================
  AUDIT LOGGING
  =========================================================
  */

  const logAdminAction = async ({
    action,
    targetUserId = null,
    details = "",
  }) => {
    const { error } = await supabase.from("admin_activity_log").insert({
      admin_id: profile.id,
      action,
      target_user_id: targetUserId,
      details,
    });

    if (error) {
      console.error("Admin activity log error:", error);
    }

    return !error;
  };

  /*
  =========================================================
  LOAD DATA
  =========================================================
  */

  const loadData = async () => {
    let memberData = [];

    if (canViewMembers) {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("points", {
          ascending: false,
        });

      if (!error) {
        memberData = data || [];
      } else {
        console.error("Members error:", error);
      }
    } else {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .neq("role", "guest")
        .eq("is_active", true)
        .order("points", {
          ascending: false,
        });

      if (!error) {
        memberData = data || [];
      }
    }

    setMembers(memberData);

    /*
      Personal history.
    */
    const { data: myHistory, error: myHistoryError } = await supabase
      .from("point_history")
      .select("*")
      .eq("member_id", profile.id)
      .order("created_at", {
        ascending: false,
      });

    if (myHistoryError) {
      console.error("Personal history error:", myHistoryError);

      setPointHistory([]);
    } else {
      setPointHistory(myHistory || []);
    }

    /*
      Full history for Admins.
    */
    if (canViewHistory) {
      const { data: fullHistory, error: fullHistoryError } = await supabase
        .from("point_history")
        .select("*")
        .order("created_at", {
          ascending: false,
        });

      if (fullHistoryError) {
        console.error("Full point history error:", fullHistoryError);

        setAllPointHistory([]);
      } else {
        setAllPointHistory(fullHistory || []);
      }
    } else {
      setAllPointHistory([]);
    }

    /*
      Previous month.
    */
    const { data: monthData, error: monthError } = await supabase
      .from("monthly_leaderboard")
      .select("*")
      .order("month_start", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (monthError) {
      console.error("Monthly leaderboard error:", monthError);

      setPreviousMonth(null);
    } else {
      setPreviousMonth(monthData || null);
    }

    /*
      News.
    */
    const { data: newsData, error: newsError } = await supabase
      .from("news")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (newsError) {
      setNews([]);
    } else {
      setNews(newsData || []);
    }

    /*
      Admin Activity.
    */
    if (canViewHistory) {
      const { data: activityData, error: activityError } = await supabase
        .from("admin_activity_log")
        .select("*")
        .order("created_at", {
          ascending: false,
        })
        .limit(500);

      if (activityError) {
        console.error("Activity log error:", activityError);

        setActivityLog([]);
      } else {
        setActivityLog(activityData || []);
      }
    } else {
      setActivityLog([]);
    }
  };

  useEffect(() => {
    loadData();
  }, [profile.role]);

  useEffect(() => {
    localStorage.setItem("uu-mlc-active-tab", tab);
    setSidebarOpen(false);
  }, [tab]);

  useEffect(() => {
    const loadTodoBadges = async () => {
      const { data, error } = await supabase
        .from("todos")
        .select("id, completed, deadline")
        .eq("completed", false);
      if (!error) setTodosForBadge(data || []);
    };
    loadTodoBadges();
    const channel = supabase
      .channel(`todo-badges-${profile.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "todos" },
        loadTodoBadges,
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [profile.id]);

  const loadNotifications = async () => {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Notification load error:", error);
      setNotifications([]);
      return;
    }

    setNotifications(data || []);
  };

  useEffect(() => {
    loadNotifications();

    const channel = supabase
      .channel(`notifications-${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${profile.id}`,
        },
        () => loadNotifications(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile.id]);

  const markNotificationRead = async (notificationId) => {
    const { error } = await supabase.rpc("mark_notification_read", {
      p_notification_id: notificationId,
    });

    if (error) {
      console.error("Mark notification read error:", error);
      return;
    }

    setNotifications((current) =>
      current.map((item) =>
        item.id === notificationId
          ? { ...item, read_at: new Date().toISOString() }
          : item,
      ),
    );
  };

  const markAllNotificationsRead = async () => {
    const { error } = await supabase.rpc("mark_all_notifications_read");

    if (error) {
      console.error("Mark all notifications read error:", error);
      return;
    }

    setNotifications((current) =>
      current.map((item) =>
        item.read_at ? item : { ...item, read_at: new Date().toISOString() },
      ),
    );
  };

  const openNotification = async (notification) => {
    if (!notification.read_at) {
      await markNotificationRead(notification.id);
    }

    if (notification.target_tab) {
      setTab(notification.target_tab);
    }

    setNotificationsOpen(false);
  };

  /*
  =========================================================
  REAL-TIME PROFILE UPDATES
  =========================================================
  */

  useEffect(() => {
    const channel = supabase
      .channel(`profiles-${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
        },
        () => {
          loadData();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile.id, profile.role]);

  /*
  =========================================================
  REAL-TIME ACTIVITY LOG
  =========================================================
  */

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    const channel = supabase
      .channel(`activity-${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "admin_activity_log",
        },
        () => {
          loadData();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile.id, profile.role, isAdmin]);

  /*
  =========================================================
  PERMISSIONS
  =========================================================
  */

  const canModifyTarget = (target) => {
    if (!canManageMembers || target?.id === profile.id) {
      return false;
    }

    if (target?.role === "head_admin" && !isHeadAdmin) {
      return false;
    }

    return true;
  };

  /*
  =========================================================
  POINT ADJUSTMENT
  =========================================================
  */

  const adjustPoints = async (memberId, points, reason) => {
    if (!canAwardPoints) {
      alert("You do not have permission to award or deduct points.");
      return false;
    }

    const target = members.find((member) => member.id === memberId);

    const { error } = await supabase.rpc("award_points", {
      p_member_id: memberId,
      p_points: Number(points),
      p_reason: reason,
    });

    if (error) {
      alert(error.message);

      return false;
    }

    await logAdminAction({
      action: "POINT_ADJUSTMENT",
      targetUserId: memberId,
      details: `${points >= 0 ? "Added" : "Removed"} ${Math.abs(
        Number(points),
      )} points${
        target ? ` for ${target.nickname || target.full_name}` : ""
      }. Reason: ${reason}`,
    });

    await loadData();
    await reloadProfile();

    return true;
  };

  /*
  =========================================================
  CHANGE ROLE
  =========================================================
  */

  const changeRole = async (memberId, newRole) => {
    const target = members.find((member) => member.id === memberId);

    if (!target) {
      alert("Member not found.");

      return false;
    }

    if (!canModifyTarget(target)) {
      alert("You cannot modify a Head Admin account.");

      return false;
    }

    if (!canManageMembers) {
      alert("You do not have permission to manage members.");
      return false;
    }

    if (newRole === "head_admin" && !isHeadAdmin) {
      alert("Only the Head Admin can assign the Head Admin role.");
      return false;
    }

    if (!roleDefinitions.some((role) => role.role_key === newRole)) {
      alert("That role is not available.");
      return false;
    }

    const oldRole = target.role;

    const { error } = await supabase
      .from("profiles")
      .update({
        role: newRole,
      })
      .eq("id", memberId);

    if (error) {
      alert(error.message);

      return false;
    }

    await logAdminAction({
      action:
        oldRole === "guest" && newRole === "member"
          ? "PROMOTE_MEMBER"
          : "ROLE_CHANGE",
      targetUserId: memberId,
      details: `Role changed from ${getRoleDisplayName(oldRole, roleDefinitions)} to ${getRoleDisplayName(
        newRole,
        roleDefinitions,
      )}.`,
    });

    await loadData();

    return true;
  };

  /*
  =========================================================
  ACTIVATE / DEACTIVATE
  =========================================================
  */

  const toggleMemberActive = async (memberId, isActive) => {
    const target = members.find((member) => member.id === memberId);

    if (!target) {
      alert("Member not found.");

      return false;
    }

    if (!canModifyTarget(target)) {
      alert("You cannot change the status of a Head Admin account.");

      return false;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        is_active: isActive,
      })
      .eq("id", memberId);

    if (error) {
      alert(error.message);

      return false;
    }

    await logAdminAction({
      action: isActive ? "ACCOUNT_REACTIVATED" : "ACCOUNT_DEACTIVATED",
      targetUserId: memberId,
      details: isActive ? "Account reactivated." : "Account deactivated.",
    });

    await loadData();

    return true;
  };

  /*
  =========================================================
  RESET ALL POINTS
  =========================================================
  */

  const resetAllPoints = async () => {
    if (!hasPermission("reset_points")) {
      alert("You do not have permission to reset points.");

      return false;
    }

    const { error } = await supabase.rpc("reset_all_points");

    if (error) {
      alert(error.message);

      return false;
    }

    await logAdminAction({
      action: "MONTHLY_POINT_RESET",
      details:
        "All current points were reset. Previous month Top Performer and Runner Up were saved.",
    });

    await loadData();
    await reloadProfile();

    return true;
  };

  /*
  =========================================================
  RESET ONE MEMBER
  =========================================================
  */

  const resetMemberPoints = async (memberId) => {
    if (!hasPermission("reset_points")) {
      alert("You do not have permission to reset points.");

      return false;
    }

    const target = members.find((member) => member.id === memberId);

    const { error } = await supabase.rpc("reset_member_points", {
      p_member_id: memberId,
    });

    if (error) {
      alert(error.message);

      return false;
    }

    await logAdminAction({
      action: "MEMBER_POINT_RESET",
      targetUserId: memberId,
      details: `Reset current points for ${
        target?.nickname || target?.full_name || "member"
      }.`,
    });

    await loadData();
    await reloadProfile();

    return true;
  };

  /*
  =========================================================
  WIPE ALL POINT DATA
  =========================================================
  */

  const deleteAllPointData = async () => {
    if (!isHeadAdmin) {
      alert("Only the Head Admin can wipe all point data.");

      return false;
    }

    if (
      !window.confirm(
        "WARNING: This permanently deletes ALL point history and sets all current member points to 0. Previous-month performance records remain.",
      )
    ) {
      return false;
    }

    if (!window.confirm("FINAL WARNING: Wipe all point data?")) {
      return false;
    }

    const { error } = await supabase.rpc("delete_all_point_data");

    if (error) {
      alert(error.message);

      return false;
    }

    await logAdminAction({
      action: "WIPE_ALL_POINT_DATA",
      details:
        "Deleted all point history and reset current member points to zero.",
    });

    await loadData();
    await reloadProfile();

    return true;
  };

  /*
  =========================================================
  WIPE PREVIOUS MONTH
  =========================================================
  */

  const deleteMonthlyLeaderboard = async () => {
    if (!isHeadAdmin) {
      alert("Only the Head Admin can wipe previous-month performance records.");

      return false;
    }

    if (
      !window.confirm(
        "WARNING: This deletes all saved Previous Month Top Performer and Runner Up records. Current points and point history stay unchanged.",
      )
    ) {
      return false;
    }

    if (!window.confirm("FINAL WARNING: Delete all previous-month records?")) {
      return false;
    }

    const { error } = await supabase.rpc("delete_monthly_leaderboard");

    if (error) {
      alert(error.message);

      return false;
    }

    await logAdminAction({
      action: "WIPE_PREVIOUS_MONTH",
      details:
        "Deleted all saved previous-month Top Performer and Runner Up records.",
    });

    await loadData();

    return true;
  };

  /*
  =========================================================
  WIPE ADMIN ACTIVITY LOG
  =========================================================
  */

  const deleteAdminActivityLog = async () => {
    if (!isHeadAdmin) {
      alert("Only the Head Admin can wipe admin activity history.");

      return false;
    }

    if (
      !window.confirm(
        "WARNING: This permanently deletes the entire Admin Activity History.",
      )
    ) {
      return false;
    }

    if (!window.confirm("FINAL WARNING: Delete all admin activity history?")) {
      return false;
    }

    const { error } = await supabase.rpc("delete_all_admin_activity_log");

    if (error) {
      alert(error.message);

      return false;
    }

    // Do not log a wipe of the log itself.
    await loadData();

    return true;
  };

  /*
  =========================================================
  ACTIVE MEMBERS
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

  const overdueTodoCount = todosForBadge.filter(
    (todo) =>
      todo.deadline &&
      new Date(`${todo.deadline}T00:00:00`) <
        new Date(new Date().setHours(0, 0, 0, 0)),
  ).length;

  const recentNewsCount = news.filter(
    (item) =>
      item.created_at &&
      Date.now() - new Date(item.created_at).getTime() <
        7 * 24 * 60 * 60 * 1000,
  ).length;

  const unreadNotificationCount = notifications.filter(
    (item) => !item.read_at,
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
