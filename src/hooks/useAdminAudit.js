import { logAdminAction as logAdminActionService } from "../services/adminAuditService";
import { useToast } from "../components/ui/toast-context.js";

/**
 * Hook-level state-free adapter for the admin audit service.
 */
export function useAdminAudit(profile) {
  const { toast } = useToast();

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
      // The action itself already happened; the audit note did not. Say so,
      // rather than letting a destructive change go unrecorded and unmentioned
      // (a club-wide wipe's only trace is this entry).
      console.error("Admin activity log error:", error);
      toast.error("Done, but the activity log entry could not be saved", {
        description: error.message,
      });
    }

    return !error;
  };

  return { logAdminAction };
}

export default useAdminAudit;
