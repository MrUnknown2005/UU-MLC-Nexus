import { supabase } from "../lib/supabaseClient";

/**
 * Writes entries to the admin_activity_log table. Every admin/member-affecting
 * action in the dashboard (role changes, point adjustments, resets, wipes)
 * calls this so there's an audit trail of who did what.
 */
export function useAdminAudit(profile) {
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

  return { logAdminAction };
}

export default useAdminAudit;
