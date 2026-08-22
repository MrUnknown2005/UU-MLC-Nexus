import { logAdminAction as logAdminActionService } from "../services/adminAuditService";

/**
 * Hook-level state-free adapter for the admin audit service.
 */
export function useAdminAudit(profile) {
  const logAdminAction = async ({
    action,
    targetUserId = null,
    details = "",
  }) => {
    const { error } = await logAdminActionService({
      adminId: profile.id,
      action,
      targetUserId,
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
