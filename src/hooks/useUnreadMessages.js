import { useEffect, useState } from "react";
import {
  unreadMessageCount,
  subscribeToInbox,
} from "../services/messagingService.js";

/**
 * Total unread messages, for the sidebar "Messages" badge.
 *
 * Mirrors useTodoBadges: one RPC for the count, refetched whenever anything in
 * the caller's inbox changes over realtime. Any read failure — most importantly
 * the messaging schema not being applied yet — resolves to zero rather than
 * throwing, so the badge is simply absent until Messaging is set up.
 */
export function useUnreadMessages(profile) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!profile?.id) return undefined;
    let active = true;

    const loadUnread = async () => {
      const { data, error } = await unreadMessageCount();
      if (!active) return;
      setUnreadCount(error ? 0 : Number(data) || 0);
    };

    loadUnread();
    const unsubscribe = subscribeToInbox(loadUnread);

    return () => {
      active = false;
      unsubscribe();
    };
  }, [profile?.id]);

  return { unreadCount };
}

export default useUnreadMessages;
