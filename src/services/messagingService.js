import { supabase } from "../lib/supabaseClient";

/**
 * Data layer for the Messages feature.
 *
 * Thin wrappers over the Supabase singleton, mirroring groupService: the UI
 * (Messages.jsx) resolves names and avatars from the `members` list the
 * dashboard already holds, so these calls carry only ids and message bodies —
 * never a profiles join we depend on behaving a particular way.
 *
 * Privacy is enforced by Row Level Security: every read is scoped to the
 * caller's own conversations, and adding OTHER people to a thread happens only
 * through the SECURITY DEFINER RPCs (start/create/open). See
 * 20260916000000_messaging.sql.
 */

/**
 * True when an error means "the messaging schema isn't there yet" rather than a
 * real failure — the same probe Groups uses, so the tab can degrade to a
 * "not set up yet" state until the migration is applied on reconnect.
 */
export function isSchemaMissingError(error) {
  if (!error) return false;
  const code = error.code || "";
  if (["42P01", "42703", "PGRST205", "PGRST204", "PGRST202"].includes(code)) return true;
  const message = (error.message || "").toLowerCase();
  return /schema cache|does not exist|find the table|could not find the/.test(message);
}

// ---- Reads -----------------------------------------------------------------

/** The caller's conversations, most-recently-active first (RLS scopes them). */
export async function fetchConversations() {
  return supabase
    .from("conversations")
    .select("id, kind, title, group_id, created_by, created_at, last_message_at")
    .order("last_message_at", { ascending: false });
}

/**
 * Participant rows for every conversation the caller can see — who is in each
 * thread, plus the caller's own last_read_at cursor.
 */
export async function fetchParticipants() {
  return supabase
    .from("conversation_participants")
    .select("conversation_id, member_id, added_at, last_read_at");
}

/**
 * A bounded window of the caller's most recent messages across all threads,
 * used to build inbox previews and per-conversation unread dots without an
 * N+1 fetch. The authoritative total is unreadMessageCount().
 */
export async function fetchRecentMessages(limit = 300) {
  return supabase
    .from("messages")
    .select("id, conversation_id, sender_id, body, created_at, deleted_at")
    .order("created_at", { ascending: false })
    .limit(limit);
}

/** Full history for one open thread, oldest first. */
export async function fetchMessages(conversationId, limit = 500) {
  return supabase
    .from("messages")
    .select("id, conversation_id, sender_id, body, created_at, deleted_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(limit);
}

/** The people the caller has blocked. */
export async function fetchBlocks() {
  return supabase.from("messaging_blocks").select("blocked_id");
}

// ---- Writes ----------------------------------------------------------------

/** Post a message. RLS requires the sender to be a participant. */
export async function sendMessage({ conversationId, senderId, body }) {
  return supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: senderId,
    body,
  });
}

/** Soft-delete the caller's own message (RLS: sender only). */
export async function deleteMessage(messageId) {
  return supabase
    .from("messages")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", messageId);
}

/** Leave a conversation (RLS: a member may delete only their own row). */
export async function leaveConversation(conversationId, memberId) {
  return supabase
    .from("conversation_participants")
    .delete()
    .eq("conversation_id", conversationId)
    .eq("member_id", memberId);
}

export async function blockMember(blockerId, blockedId) {
  return supabase
    .from("messaging_blocks")
    .insert({ blocker_id: blockerId, blocked_id: blockedId });
}

export async function unblockMember(blockerId, blockedId) {
  return supabase
    .from("messaging_blocks")
    .delete()
    .eq("blocker_id", blockerId)
    .eq("blocked_id", blockedId);
}

/** Who can open a new DM with me: 'everyone' | 'groups' | 'none'. */
export async function setDmPrivacy(profileId, value) {
  return supabase.from("profiles").update({ dm_privacy: value }).eq("id", profileId);
}

// ---- RPCs (privileged: privacy checks + atomic multi-row writes) -----------

export async function startDirectConversation(targetId) {
  return supabase.rpc("start_direct_conversation", { target: targetId });
}

export async function createGroupConversation(title, memberIds) {
  return supabase.rpc("create_group_conversation", {
    p_title: title,
    p_member_ids: memberIds,
  });
}

export async function openGroupConversation(groupId) {
  return supabase.rpc("open_group_conversation", { p_group_id: groupId });
}

export async function markConversationRead(conversationId) {
  return supabase.rpc("mark_conversation_read", { p_conversation_id: conversationId });
}

export async function unreadMessageCount() {
  return supabase.rpc("unread_message_count");
}

// ---- Realtime --------------------------------------------------------------

/**
 * One channel covering everything the inbox depends on: new/updated
 * conversations, participant changes (added to a thread, read cursor), and
 * messages. Returns an unsubscribe, same shape as groupService.
 */
export function subscribeToInbox(onChange) {
  const channel = supabase
    .channel("messaging-inbox")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "conversations" },
      onChange,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "conversation_participants" },
      onChange,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "messages" },
      onChange,
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

/**
 * Messages for one open thread, filtered server-side to that conversation (the
 * per-recipient filter precedent from notificationService). Returns an
 * unsubscribe.
 */
export function subscribeToConversation(conversationId, onChange) {
  const channel = supabase
    .channel(`messaging-conversation-${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      onChange,
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

export default {
  isSchemaMissingError,
  fetchConversations,
  fetchParticipants,
  fetchRecentMessages,
  fetchMessages,
  fetchBlocks,
  sendMessage,
  deleteMessage,
  leaveConversation,
  blockMember,
  unblockMember,
  setDmPrivacy,
  startDirectConversation,
  createGroupConversation,
  openGroupConversation,
  markConversationRead,
  unreadMessageCount,
  subscribeToInbox,
  subscribeToConversation,
};
