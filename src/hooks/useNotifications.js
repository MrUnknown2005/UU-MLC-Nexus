import { useEffect, useState } from "react";
import { useToast } from "../components/ui/toast-context.js";
import {
  deleteAllNotifications,
  deleteOwnNotifications,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeToNotifications,
} from "../services/notificationService";

/**
 * UI adapter for notification state. Supabase access lives in the service.
 */
export function useNotifications({ profile, setTab, logAdminAction }) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const { toast } = useToast();

  const loadNotifications = async () => {
    const { data, error } = await fetchNotifications(profile.id);

    if (error) {
      // Console-only by design: the bell is an ambient secondary feature that
      // reloads on every realtime event and on remount, so a transient failure
      // self-heals. A toast on each bell-load blip would be noise — the
      // user-facing load-failure surface is the dashboard (useDashboardData).
      console.error("Notification load error:", error);
      setNotifications([]);
      return;
    }

    setNotifications(data || []);
  };

  useEffect(() => {
    // Intentional fetch-on-mount, paired with a realtime subscription below.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadNotifications();

    const unsubscribe = subscribeToNotifications(profile.id, loadNotifications);

    return unsubscribe;
    // loadNotifications is intentionally omitted: it's redefined each render,
    // and including it would tear down/recreate the realtime subscription unnecessarily.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id]);

  const markRead = async (notificationId) => {
    const { error } = await markNotificationRead(notificationId);

    if (error) {
      // No toast here, unlike the bulk actions below: markRead is a side effect
      // of openNotification (opening a notification / navigating), not an action
      // the user explicitly invoked. The navigation still succeeds, and a missed
      // read-flag self-heals on the next load/realtime sync. The false return
      // lets a caller react if it ever needs to; openNotification ignores it.
      console.error("Mark notification read error:", error);
      return false;
    }

    setNotifications((current) =>
      current.map((item) =>
        item.id === notificationId
          ? { ...item, read_at: new Date().toISOString() }
          : item,
      ),
    );

    return true;
  };

  const markAllRead = async () => {
    const { error } = await markAllNotificationsRead();

    if (error) {
      console.error("Mark all notifications read error:", error);
      toast.error("Couldn't mark notifications as read", {
        description: error.message || "The server rejected the change.",
      });
      return false;
    }

    setNotifications((current) =>
      current.map((item) =>
        item.read_at ? item : { ...item, read_at: new Date().toISOString() },
      ),
    );

    return true;
  };

  const clearOwn = async () => {
    const { error } = await deleteOwnNotifications();

    if (error) {
      console.error("Clear notifications error:", error);
      toast.error("Couldn't clear notifications", {
        description: error.message || "The server rejected the change.",
      });
      return false;
    }

    setNotifications([]);
    return true;
  };

  const clearAll = async () => {
    const { error } = await deleteAllNotifications();

    if (error) {
      console.error("Clear all notifications error:", error);
      toast.error("Couldn't clear notifications", {
        description: error.message || "The server rejected the change.",
      });
      return false;
    }

    // Own bell empties immediately; other members' bells clear via the realtime
    // subscription. Logged after the delete so a failed wipe leaves no entry.
    await logAdminAction?.({
      action: "WIPE_ALL_NOTIFICATIONS",
      details: "Deleted all member notifications club-wide.",
    });

    setNotifications([]);
    return true;
  };

  const openNotification = async (notification) => {
    if (!notification.read_at) {
      await markRead(notification.id);
    }

    if (notification.target_tab) {
      setTab(notification.target_tab);
    }

    setNotificationsOpen(false);
  };

  const unreadNotificationCount = notifications.filter(
    (item) => !item.read_at,
  ).length;

  return {
    notifications,
    notificationsOpen,
    setNotificationsOpen,
    unreadNotificationCount,
    markAllNotificationsRead: markAllRead,
    clearOwnNotifications: clearOwn,
    clearAllNotifications: clearAll,
    openNotification,
  };
}

export default useNotifications;
