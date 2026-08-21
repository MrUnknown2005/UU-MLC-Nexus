import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * Loads the signed-in member's notifications, keeps them in sync via a
 * realtime subscription, and exposes the actions the notification bell
 * needs (open dropdown, mark one/all read, jump to the tab a notification
 * points at).
 */
export function useNotifications({ profile, setTab }) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

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
    // Intentional fetch-on-mount, paired with a realtime subscription below.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    // loadNotifications is intentionally omitted: it's redefined each render,
    // and including it would tear down/recreate the realtime subscription unnecessarily.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const unreadNotificationCount = notifications.filter(
    (item) => !item.read_at,
  ).length;

  return {
    notifications,
    notificationsOpen,
    setNotificationsOpen,
    unreadNotificationCount,
    markAllNotificationsRead,
    openNotification,
  };
}

export default useNotifications;
