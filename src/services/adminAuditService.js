import { supabase } from "../lib/supabaseClient";

/**
 * Persists an administrative audit entry. Authorization remains enforced by
 * Supabase RLS; this module only centralizes the data-access operation.
 */
export async function logAdminAction({
  adminId,
  action,
  targetUserId = null,
  details = "",
}) {
  return supabase.from("admin_activity_log").insert({
    admin_id: adminId,
    action,
    target_user_id: targetUserId,
    details,
  });
}

export default { logAdminAction };
