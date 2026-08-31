import { getRoleDisplayName } from "../lib/roleHelpers";
import { useToast } from "../components/ui/toast-context.js";
import {
  awardPoints as awardPointsService,
  deleteAdminActivityLog as deleteAdminActivityLogService,
  deleteAllPointData as deleteAllPointDataService,
  deleteMonthlyLeaderboard as deleteMonthlyLeaderboardService,
  resetAllPoints as resetAllPointsService,
  resetMemberPoints as resetMemberPointsService,
  updateMemberActive,
  updateMemberRole,
} from "../services/memberService";

/**
 * Every admin action that mutates a member or their points.
 *
 * Two things moved out of this file.
 *
 * Confirmation is now the page's job. This hook used to stack two
 * `window.confirm` dialogs in front of each destructive action, which trains
 * people to click through both without reading either — and it meant the
 * warning text could not name what was actually about to be deleted. The pages
 * ask instead, with a typed phrase and an itemised list of consequences.
 *
 * Reporting stays here, because this is the layer that knows why something
 * failed, but it goes through the toast system rather than `alert()`. A blocking
 * modal for "the server said no" interrupts the person to tell them nothing
 * happened; a toast says the same thing without taking the keyboard hostage.
 *
 * Each action still returns a boolean, so callers can decide what to say on
 * success — the outcome the member cares about is theirs to phrase.
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
  const { toast } = useToast();

  /** The server refused. Its own message is more useful than anything generic. */
  const reportFailure = (error, fallback) => {
    toast.error(fallback, {
      description: error?.message || "The server rejected the change.",
    });
    return false;
  };

  const reportDenied = (description) => {
    toast.error("Not allowed", { description });
    return false;
  };

  /**
   * Guards that mirror the database's own rules: nobody edits themselves
   * through the admin surface, and only the head admin touches a head admin.
   */
  const blockedReason = (target) => {
    if (!canManageMembers) {
      return "You do not have permission to manage members.";
    }

    if (target?.id === profile.id) {
      return "You cannot change your own account from here. Use your profile page.";
    }

    if (target?.role === "head_admin" && !isHeadAdmin) {
      return "Head admin accounts can only be changed by the head admin.";
    }

    return "";
  };

  const adjustPoints = async (memberId, points, reason) => {
    if (!canAwardPoints) {
      return reportDenied("You do not have permission to award or deduct points.");
    }

    const target = members.find((member) => member.id === memberId);
    const { error } = await awardPointsService(memberId, points, reason);

    if (error) return reportFailure(error, "Could not record the adjustment");

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
      return reportDenied("That member is no longer in the list. Refresh and try again.");
    }

    const blocked = blockedReason(target);
    if (blocked) return reportDenied(blocked);

    if (newRole === "head_admin" && !isHeadAdmin) {
      return reportDenied("Only the head admin can assign the head admin role.");
    }

    if (!roleDefinitions.some((role) => role.role_key === newRole)) {
      return reportDenied("That role no longer exists.");
    }

    const oldRole = target.role;
    const { error } = await updateMemberRole(memberId, newRole);

    if (error) return reportFailure(error, "Could not change the role");

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
      return reportDenied("That member is no longer in the list. Refresh and try again.");
    }

    const blocked = blockedReason(target);
    if (blocked) return reportDenied(blocked);

    const { error } = await updateMemberActive(memberId, isActive);

    if (error) {
      return reportFailure(
        error,
        isActive ? "Could not reactivate the account" : "Could not deactivate the account",
      );
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
      return reportDenied("You do not have permission to reset points.");
    }

    const { error } = await resetAllPointsService();

    if (error) return reportFailure(error, "Could not reset the leaderboard");

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
      return reportDenied("You do not have permission to reset points.");
    }

    const target = members.find((member) => member.id === memberId);
    const { error } = await resetMemberPointsService(memberId);

    if (error) return reportFailure(error, "Could not reset that member");

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
      return reportDenied("Only the head admin can wipe all point data.");
    }

    const { error } = await deleteAllPointDataService();

    if (error) return reportFailure(error, "Could not delete the point data");

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
      return reportDenied(
        "Only the head admin can delete archived monthly records.",
      );
    }

    const { error } = await deleteMonthlyLeaderboardService();

    if (error) return reportFailure(error, "Could not delete the archive");

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
      return reportDenied("Only the head admin can wipe the activity log.");
    }

    const { error } = await deleteAdminActivityLogService();

    if (error) return reportFailure(error, "Could not delete the activity log");

    // Deliberately not logged: the first entry in a freshly wiped audit trail
    // should not be a record of the wipe covering its own tracks.
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
