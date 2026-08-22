import { supabase } from "../lib/supabaseClient";

export async function fetchNotifications(userId) {
  return supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
}

export async function markNotificationRead(notificationId) {
  return supabase.rpc("mark_notification_read", {
    p_notification_id: notificationId,
  });
}

export async function markAllNotificationsRead() {
  return supabase.rpc("mark_all_notifications_read");
}

export function subscribeToNotifications(userId, onChange) {
  const channel = supabase
    .channel(`notifications-${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      onChange,
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

export default {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  subscribeToNotifications,
};
