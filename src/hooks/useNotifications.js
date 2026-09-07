import { useEffect, useState } from "react";
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

  const loadNotifications = async () => {
    const { data, error } = await fetchNotifications(profile.id);

    if (error) {
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
      return false;
    }

    setNotifications([]);
    return true;
  };

  const clearAll = async () => {
    const { error } = await deleteAllNotifications();

    if (error) {
      console.error("Clear all notifications error:", error);
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
