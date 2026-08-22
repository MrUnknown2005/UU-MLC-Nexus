import { getRoleDisplayName } from "../lib/roleHelpers";
import {
  awardPoints,
  deleteAdminActivityLog,
  deleteAllPointData,
  deleteMonthlyLeaderboard,
  resetAllPoints,
  resetMemberPoints,
  updateMemberActive,
  updateMemberRole,
} from "../services/memberService";

/**
 * All admin actions that mutate members or their points.
 * UI permission checks, confirmations, alerts, and state refreshes stay here;
 * Supabase data access is delegated to memberService.
 */
export function useMemberActions({
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
}) {
  const canModifyTarget = (target) => {
    if (!canManageMembers || target?.id === profile.id) {
      return false;
    }

    if (target?.role === "head_admin" && !isHeadAdmin) {
      return false;
    }

    return true;
  };

  const adjustPoints = async (memberId, points, reason) => {
    if (!canAwardPoints) {
      alert("You do not have permission to award or deduct points.");
      return false;
    }

    const target = members.find((member) => member.id === memberId);
    const { error } = await awardPoints(memberId, points, reason);

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
    const { error } = await updateMemberRole(memberId, newRole);

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

    const { error } = await updateMemberActive(memberId, isActive);

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

  const resetAllPoints = async () => {
    if (!hasPermission("reset_points")) {
      alert("You do not have permission to reset points.");
      return false;
    }

    const { error } = await resetAllPoints();

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

  const resetMemberPoints = async (memberId) => {
    if (!hasPermission("reset_points")) {
      alert("You do not have permission to reset points.");
      return false;
    }

    const target = members.find((member) => member.id === memberId);
    const { error } = await resetMemberPoints(memberId);

    if (error) {
      alert(error.message);
      return false;
    }

    await logAdminAction({
      action: "MEMBER_POINT_RESET",
      targetUserId: memberId,
      details: `Reset current points for ${target?.nickname || target?.full_name || "member"}.`,
    });

    await loadData();
    await reloadProfile();
    return true;
  };

  const deleteAllPointData = async () => {
    if (!isHeadAdmin) {
      alert("Only the Head Admin can wipe all point data.");
      return false;
    }

    if (
      !window.confirm(
        "WARNING: This permanently deletes ALL point history and sets all current member points to 0. Previous-month performance records remain.",
      ) ||
      !window.confirm("FINAL WARNING: Wipe all point data?")
    ) {
      return false;
    }

    const { error } = await deleteAllPointData();

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

  const deleteMonthlyLeaderboard = async () => {
    if (!isHeadAdmin) {
      alert("Only the Head Admin can wipe previous-month performance records.");
      return false;
    }

    if (
      !window.confirm(
        "WARNING: This deletes all saved Previous Month Top Performer and Runner Up records. Current points and point history stay unchanged.",
      ) ||
      !window.confirm("FINAL WARNING: Delete all previous-month records?")
    ) {
      return false;
    }

    const { error } = await deleteMonthlyLeaderboard();

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

  const deleteAdminActivityLog = async () => {
    if (!isHeadAdmin) {
      alert("Only the Head Admin can wipe admin activity history.");
      return false;
    }

    if (
      !window.confirm(
        "WARNING: This permanently deletes the entire Admin Activity History.",
      ) ||
      !window.confirm("FINAL WARNING: Delete all admin activity history?")
    ) {
      return false;
    }

    const { error } = await deleteAdminActivityLog();

    if (error) {
      alert(error.message);
      return false;
    }

    // Do not log a wipe of the log itself.
    await loadData();
    return true;
  };

  return {
    adjustPoints,
    changeRole,
    toggleMemberActive,
    resetAllPoints,
    resetMemberPoints,
    deleteAllPointData,
    deleteMonthlyLeaderboard,
    deleteAdminActivityLog,
  };
}

export default useMemberActions;
