import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "../ui/Avatar.jsx";
import { Badge } from "../ui/Badge.jsx";
import { Button } from "../ui/Button.jsx";
import { Checkbox } from "../ui/Checkbox.jsx";
import { EmptyState } from "../ui/EmptyState.jsx";
import { Icon } from "../ui/Icon.jsx";
import { IconButton } from "../ui/IconButton.jsx";
import { Modal } from "../ui/Modal.jsx";
import { Panel } from "../ui/Panel.jsx";
import { Popover } from "../ui/Popover.jsx";
import { SearchInput } from "../ui/SearchInput.jsx";
import { SegmentedControl } from "../ui/SegmentedControl.jsx";
import { Skeleton } from "../ui/Skeleton.jsx";
import { TextInput } from "../ui/TextInput.jsx";
import { useConfirm } from "../ui/confirm-context.js";
import { useToast } from "../ui/toast-context.js";
import { fetchGroupMembers } from "../../services/groupService.js";
import {
  blockMember,
  createGroupConversation,
  deleteMessage,
  fetchBlocks,
  fetchConversations,
  fetchMessages,
  fetchParticipants,
  fetchRecentMessages,
  isSchemaMissingError,
  leaveConversation,
  markConversationRead,
  openGroupConversation,
  sendMessage,
  setDmPrivacy,
  startDirectConversation,
  subscribeToConversation,
  subscribeToInbox,
  unblockMember,
} from "../../services/messagingService.js";
import { cn } from "../../lib/cn.js";
import {
  countLabel,
  displayName,
  formatRelative,
  humanizeToken,
  truncate,
} from "../../lib/format.js";

/* Who can open a NEW direct conversation with me. People I already talk to are
   unaffected — this only gates the "start a conversation" doors. */
const PRIVACY_OPTIONS = [
  { value: "everyone", label: "Anyone", icon: "users" },
  { value: "groups", label: "Group-mates", icon: "grid" },
  { value: "none", label: "No one", icon: "lock" },
];

const PRIVACY_HELP = {
  everyone: "Any member can start a conversation with you.",
  groups: "Only members who share a group with you can start a new conversation.",
  none: "No one can start a new conversation with you — you can still message others.",
};

const MENU_ITEM =
  "flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-left text-[0.8125rem] font-medium transition-colors";

/**
 * Members-only in-app chat: direct messages, ad-hoc groups, and one auto-room
 * per admin-assigned Group. Loads its own data (mountedRef + refetch-on-event,
 * same as Groups/Todo) and degrades to a "not set up yet" state via
 * isSchemaMissingError until the messaging migration is applied.
 *
 * Identity is shown as displayName + Avatar only. The profiles table holds no
 * contact fields, so the member list here cannot leak any — there is none.
 */
export default function Messages({ members = [], currentUserId, profile }) {
  const confirm = useConfirm();
  const { toast } = useToast();

  const [conversations, setConversations] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [recentMessages, setRecentMessages] = useState([]);
  const [blockedIds, setBlockedIds] = useState(() => new Set());
  const [loading, setLoading] = useState(true);
  const [notSetUp, setNotSetUp] = useState(false);

  const [activeId, setActiveId] = useState(null);
  const [thread, setThread] = useState({ id: null, messages: [] });

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const [inboxSearch, setInboxSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const [dmOpen, setDmOpen] = useState(false);
  const [dmSearch, setDmSearch] = useState("");
  const [startingDm, setStartingDm] = useState(false);

  const [groupOpen, setGroupOpen] = useState(false);
  const [groupTitle, setGroupTitle] = useState("");
  const [groupSearch, setGroupSearch] = useState("");
  const [groupPicks, setGroupPicks] = useState(() => new Set());
  const [creatingGroup, setCreatingGroup] = useState(false);

  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [privacy, setPrivacy] = useState(profile?.dm_privacy || "everyone");

  const mountedRef = useRef(true);
  const autoRoomsRef = useRef(false);
  const scrollRef = useRef(null);
  const composerRef = useRef(null);

  // ---- Data loading --------------------------------------------------------

  const loadInbox = useCallback(async () => {
    const [convRes, partRes, msgRes, blockRes] = await Promise.all([
      fetchConversations(),
      fetchParticipants(),
      fetchRecentMessages(),
      fetchBlocks(),
    ]);

    if (!mountedRef.current) return;

    const firstError =
      convRes.error || partRes.error || msgRes.error || blockRes.error;

    // Tables aren't there yet — degrade to a friendly empty state instead of
    // spilling a red error the club can do nothing about.
    if (firstError && isSchemaMissingError(firstError)) {
      setNotSetUp(true);
      setConversations([]);
      setParticipants([]);
      setRecentMessages([]);
      setBlockedIds(new Set());
      setLoading(false);
      return;
    }

    if (firstError) {
      console.error("Messages load error:", firstError);
    }

    setNotSetUp(false);
    setConversations(convRes.data || []);
    setParticipants(partRes.data || []);
    setRecentMessages(msgRes.data || []);
    setBlockedIds(new Set((blockRes.data || []).map((row) => row.blocked_id)));
    setLoading(false);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    // Intentional fetch-on-mount, paired with the realtime subscription below;
    // state is only set after the awaited load resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadInbox();

    const unsubscribe = subscribeToInbox(() => {
      loadInbox();
    });

    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, [loadInbox]);

  const refreshThread = useCallback(async (conversationId) => {
    if (!conversationId) return;
    const { data, error } = await fetchMessages(conversationId);
    if (!mountedRef.current) return;
    if (error && !isSchemaMissingError(error)) {
      console.error("Thread load error:", error);
    }
    setThread({ id: conversationId, messages: error ? [] : data || [] });
  }, []);

  // Load + subscribe to the open thread; mark it read on open and on new arrivals.
  useEffect(() => {
    if (!activeId) return undefined;

    refreshThread(activeId);
    markConversationRead(activeId).then(() => {
      if (mountedRef.current) loadInbox();
    });

    const unsubscribe = subscribeToConversation(activeId, () => {
      refreshThread(activeId);
      markConversationRead(activeId);
    });

    return () => unsubscribe();
  }, [activeId, refreshThread, loadInbox]);

  // Ad-hoc rooms already exist; make sure each of my Groups has its room too, so
  // they appear without anyone having to create them. Fully defensive: a missing
  // groups/messaging schema simply skips this and leaves DMs untouched.
  useEffect(() => {
    if (loading || notSetUp || autoRoomsRef.current) return;
    autoRoomsRef.current = true;
    let cancelled = false;

    (async () => {
      const { data, error } = await fetchGroupMembers();
      if (cancelled || error || !data) return;

      const myGroupIds = [
        ...new Set(
          data
            .filter((row) => row.member_id === currentUserId)
            .map((row) => row.group_id),
        ),
      ];
      if (myGroupIds.length === 0) return;

      const results = await Promise.all(
        myGroupIds.map((groupId) => openGroupConversation(groupId)),
      );
      const anyOpened = results.some((res) => !res.error);
      if (!cancelled && mountedRef.current && anyOpened) loadInbox();
    })();

    return () => {
      cancelled = true;
    };
  }, [loading, notSetUp, currentUserId, loadInbox]);

  // Stick the open thread to the bottom as messages load or arrive.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [thread, activeId]);

  // ---- Derived data --------------------------------------------------------

  const memberById = useMemo(
    () => new Map(members.map((member) => [member.id, member])),
    [members],
  );

  const resolveMember = useCallback(
    (id) => memberById.get(id) || { id, full_name: null, nickname: null },
    [memberById],
  );

  const participantsByConv = useMemo(() => {
    const map = new Map();
    for (const part of participants) {
      const list = map.get(part.conversation_id);
      if (list) list.push(part);
      else map.set(part.conversation_id, [part]);
    }
    return map;
  }, [participants]);

  const myReadAt = useMemo(() => {
    const map = new Map();
    for (const part of participants) {
      if (part.member_id === currentUserId) {
        map.set(part.conversation_id, part.last_read_at);
      }
    }
    return map;
  }, [participants, currentUserId]);

  // recentMessages is created_at DESC, so the first row seen per conversation is
  // its latest message.
  const lastMessageByConv = useMemo(() => {
    const map = new Map();
    for (const message of recentMessages) {
      if (!map.has(message.conversation_id)) {
        map.set(message.conversation_id, message);
      }
    }
    return map;
  }, [recentMessages]);

  const unreadByConv = useMemo(() => {
    const map = new Map();
    for (const message of recentMessages) {
      if (message.deleted_at || message.sender_id === currentUserId) continue;
      const readAt = myReadAt.get(message.conversation_id);
      if (readAt && new Date(message.created_at) <= new Date(readAt)) continue;
      map.set(message.conversation_id, (map.get(message.conversation_id) || 0) + 1);
    }
    return map;
  }, [recentMessages, myReadAt, currentUserId]);

  const describeConversation = useCallback(
    (conv) => {
      const parts = participantsByConv.get(conv.id) || [];
      const others = parts.filter((part) => part.member_id !== currentUserId);
      if (conv.kind === "group") {
        return { isGroup: true, title: conv.title || "Group chat", parts, others };
      }
      const otherId = others[0]?.member_id;
      const otherMember = otherId ? memberById.get(otherId) : null;
      return {
        isGroup: false,
        title: otherId ? displayName(resolveMember(otherId)) : "Direct message",
        otherId,
        otherMember,
        parts,
        others,
      };
    },
    [participantsByConv, memberById, resolveMember, currentUserId],
  );

  const firstName = useCallback(
    (id) => displayName(resolveMember(id)).split(" ")[0],
    [resolveMember],
  );

  const sortedConversations = useMemo(
    () =>
      [...conversations].sort(
        (a, b) => new Date(b.last_message_at) - new Date(a.last_message_at),
      ),
    [conversations],
  );

  const visibleConversations = useMemo(() => {
    const needle = inboxSearch.trim().toLowerCase();
    if (!needle) return sortedConversations;
    return sortedConversations.filter((conv) =>
      describeConversation(conv).title.toLowerCase().includes(needle),
    );
  }, [sortedConversations, inboxSearch, describeConversation]);

  const activeConv = useMemo(
    () => conversations.find((conv) => conv.id === activeId) || null,
    [conversations, activeId],
  );
  const activeDesc = useMemo(
    () => (activeConv ? describeConversation(activeConv) : null),
    [activeConv, describeConversation],
  );
  const activeParticipants = activeDesc?.parts || [];
  const otherBlocked =
    activeDesc && !activeDesc.isGroup && activeDesc.otherId
      ? blockedIds.has(activeDesc.otherId)
      : false;
  const threadReady = thread.id === activeId;

  const dmCandidates = useMemo(() => {
    const needle = dmSearch.trim().toLowerCase();
    return members.filter(
      (member) =>
        member.id !== currentUserId &&
        member.role !== "guest" &&
        member.is_active !== false &&
        !blockedIds.has(member.id) &&
        (!needle || displayName(member).toLowerCase().includes(needle)),
    );
  }, [members, currentUserId, blockedIds, dmSearch]);

  const groupCandidates = useMemo(() => {
    const needle = groupSearch.trim().toLowerCase();
    return members.filter(
      (member) =>
        member.id !== currentUserId &&
        member.role !== "guest" &&
        member.is_active !== false &&
        (!needle || displayName(member).toLowerCase().includes(needle)),
    );
  }, [members, currentUserId, groupSearch]);

  // ---- Actions -------------------------------------------------------------

  const send = async () => {
    const body = draft.trim();
    if (!body || !activeId || sending) return;
    setSending(true);
    const { error } = await sendMessage({
      conversationId: activeId,
      senderId: currentUserId,
      body,
    });
    if (!mountedRef.current) return;
    setSending(false);
    if (error) {
      toast.error("Message not sent", { description: error.message });
      return;
    }
    setDraft("");
    composerRef.current?.focus();
    await refreshThread(activeId);
    loadInbox();
  };

  const onComposerKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  };

  const beginDirect = async (memberId) => {
    setStartingDm(true);
    const { data, error } = await startDirectConversation(memberId);
    if (!mountedRef.current) return;
    setStartingDm(false);
    if (error) {
      toast.error("Couldn't start the conversation", { description: error.message });
      return;
    }
    setDmOpen(false);
    setDmSearch("");
    await loadInbox();
    setActiveId(data);
  };

  const createGroup = async () => {
    const title = groupTitle.trim();
    if (!title) {
      toast.error("Name your group first");
      return;
    }
    if (groupPicks.size === 0) {
      toast.error("Pick at least one member");
      return;
    }
    setCreatingGroup(true);
    const { data, error } = await createGroupConversation(title, [...groupPicks]);
    if (!mountedRef.current) return;
    setCreatingGroup(false);
    if (error) {
      toast.error("Couldn't create the group", { description: error.message });
      return;
    }
    setGroupOpen(false);
    setGroupTitle("");
    setGroupSearch("");
    setGroupPicks(new Set());
    await loadInbox();
    setActiveId(data);
  };

  const togglePick = (id) => {
    setGroupPicks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleBlock = async () => {
    const otherId = activeDesc?.otherId;
    if (!otherId) return;
    setMenuOpen(false);
    const { error } = otherBlocked
      ? await unblockMember(currentUserId, otherId)
      : await blockMember(currentUserId, otherId);
    if (error) {
      toast.error("Couldn't update block", { description: error.message });
      return;
    }
    toast.success(otherBlocked ? "Member unblocked" : "Member blocked");
    loadInbox();
  };

  const leave = async () => {
    if (!activeConv) return;
    setMenuOpen(false);
    const confirmed = await confirm({
      title: "Leave this conversation?",
      description:
        "You'll stop receiving its messages. Someone can add you back later.",
      tone: "danger",
      confirmLabel: "Leave",
    });
    if (!confirmed) return;
    const { error } = await leaveConversation(activeConv.id, currentUserId);
    if (error) {
      toast.error("Couldn't leave", { description: error.message });
      return;
    }
    setActiveId(null);
    await loadInbox();
    toast.success("You left the conversation");
  };

  const removeMessage = async (message) => {
    const confirmed = await confirm({
      title: "Delete this message?",
      description: "It will show as “Message deleted” for everyone in the chat.",
      tone: "danger",
      confirmLabel: "Delete",
    });
    if (!confirmed) return;
    const { error } = await deleteMessage(message.id);
    if (error) {
      toast.error("Couldn't delete the message", { description: error.message });
      return;
    }
    await refreshThread(activeId);
    loadInbox();
  };

  const savePrivacy = async (value) => {
    const previous = privacy;
    setPrivacy(value);
    const { error } = await setDmPrivacy(currentUserId, value);
    if (error) {
      setPrivacy(previous);
      toast.error("Couldn't update privacy", { description: error.message });
      return;
    }
    toast.success("Privacy updated");
  };

  // ---- Render states -------------------------------------------------------

  if (loading) {
    return (
      <div
        className="nx-panel flex h-[calc(100dvh-var(--topbar-h)-7rem)] min-h-[32rem] overflow-hidden"
        aria-busy="true"
        aria-live="polite"
      >
        <span className="sr-only">Loading messages…</span>
        <div className="hidden w-80 shrink-0 flex-col gap-2 border-r border-line p-3 lg:flex">
          <Skeleton className="h-9 w-full" />
          {[0, 1, 2, 3, 4].map((cell) => (
            <Skeleton key={cell} className="h-14 w-full" />
          ))}
        </div>
        <div className="flex flex-1 flex-col p-4">
          <Skeleton className="h-8 w-48" />
          <div className="mt-6 flex-1 space-y-3">
            {[0, 1, 2].map((cell) => (
              <Skeleton key={cell} className="h-12 w-2/3" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (notSetUp) {
    return (
      <Panel pad="lg">
        <EmptyState
          icon="send"
          title="Messaging isn't set up yet"
          description="Direct and group messages will live here. This feature is being set up — check back soon and your conversations will appear on their own."
        />
      </Panel>
    );
  }

  return (
    <div className="nx-rise nx-panel flex h-[calc(100dvh-var(--topbar-h)-7rem)] min-h-[32rem] overflow-hidden">
      {/* Conversation list */}
      <aside
        className={cn(
          "w-full min-w-0 flex-col lg:flex lg:w-80 lg:shrink-0 lg:border-r lg:border-line",
          activeId ? "hidden" : "flex",
        )}
      >
        <div className="flex items-center gap-1.5 border-b border-line px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="text-[0.875rem] font-semibold text-ink">Messages</p>
            <p className="text-[0.72rem] text-ink-muted">
              {countLabel(conversations.length, "conversation")}
            </p>
          </div>
          <IconButton
            icon="sliders"
            label="Who can message you"
            size="sm"
            onClick={() => setPrivacyOpen(true)}
          />
          <IconButton
            icon="mail"
            label="New message"
            variant="surface"
            size="sm"
            onClick={() => setDmOpen(true)}
          />
          <IconButton
            icon="users"
            label="New group"
            variant="surface"
            size="sm"
            onClick={() => setGroupOpen(true)}
          />
        </div>

        <div className="border-b border-line p-2.5">
          <SearchInput
            value={inboxSearch}
            onChange={setInboxSearch}
            placeholder="Search conversations"
            hotkey={false}
          />
        </div>

        <div className="nx-scroll-y min-h-0 flex-1 p-2">
          {visibleConversations.length === 0 ? (
            <div className="px-2 py-10">
              <EmptyState
                compact
                icon="inbox"
                title={inboxSearch ? "No matches" : "No conversations yet"}
                description={
                  inboxSearch
                    ? "Try a different name."
                    : "Start a direct message or create a group to begin."
                }
              />
            </div>
          ) : (
            <ul className="space-y-0.5">
              {visibleConversations.map((conv) => {
                const desc = describeConversation(conv);
                const last = lastMessageByConv.get(conv.id);
                const unread = unreadByConv.get(conv.id) || 0;
                const preview = last
                  ? last.deleted_at
                    ? "Message deleted"
                    : `${
                        last.sender_id === currentUserId
                          ? "You: "
                          : desc.isGroup
                            ? `${firstName(last.sender_id)}: `
                            : ""
                      }${truncate(last.body, 60)}`
                  : "No messages yet";

                return (
                  <li key={conv.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(conv.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-control px-2.5 py-2 text-left transition-colors",
                        conv.id === activeId ? "nx-selected" : "hover:bg-hover",
                      )}
                    >
                      {desc.isGroup ? (
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-text">
                          <Icon name="users" size={18} />
                        </span>
                      ) : (
                        <Avatar
                          src={desc.otherMember?.avatar_url}
                          name={desc.title}
                          seed={desc.otherId || conv.id}
                          size="md"
                        />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-[0.8125rem] font-semibold text-ink">
                            {desc.title}
                          </span>
                          {last && (
                            <span className="shrink-0 text-[0.6875rem] text-ink-subtle">
                              {formatRelative(last.created_at)}
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 flex items-center justify-between gap-2">
                          <span
                            className={cn(
                              "truncate text-[0.75rem]",
                              unread > 0
                                ? "font-medium text-ink"
                                : "text-ink-muted",
                            )}
                          >
                            {preview}
                          </span>
                          {unread > 0 && (
                            <Badge tone="brand" size="sm">
                              {unread > 99 ? "99+" : unread}
                            </Badge>
                          )}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* Conversation view */}
      <section
        className={cn(
          "min-w-0 flex-1 flex-col",
          activeId ? "flex" : "hidden lg:flex",
        )}
      >
        {activeConv && activeDesc ? (
          <>
            <div className="flex items-center gap-2.5 border-b border-line px-3 py-2.5">
              <IconButton
                icon="arrow-left"
                label="Back to conversations"
                size="sm"
                className="lg:hidden"
                onClick={() => setActiveId(null)}
              />
              {activeDesc.isGroup ? (
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-text">
                  <Icon name="users" size={16} />
                </span>
              ) : (
                <Avatar
                  src={activeDesc.otherMember?.avatar_url}
                  name={activeDesc.title}
                  seed={activeDesc.otherId || activeConv.id}
                  size="sm"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-[0.875rem] font-semibold text-ink">
                  {activeDesc.title}
                  {otherBlocked && (
                    <Icon name="ban" size={13} className="shrink-0 text-danger" />
                  )}
                </p>
                <p className="truncate text-[0.72rem] text-ink-muted">
                  {activeDesc.isGroup
                    ? countLabel(activeParticipants.length, "member")
                    : "Direct message"}
                </p>
              </div>

              <Popover
                open={menuOpen}
                onOpenChange={setMenuOpen}
                label="Conversation options"
                width="15rem"
                renderTrigger={(triggerProps) => (
                  <IconButton
                    icon="more-horizontal"
                    label="Conversation options"
                    size="sm"
                    {...triggerProps}
                  />
                )}
              >
                <div className="flex flex-col gap-0.5">
                  {!activeDesc.isGroup && activeDesc.otherId && (
                    <button
                      type="button"
                      onClick={toggleBlock}
                      className={cn(
                        MENU_ITEM,
                        otherBlocked
                          ? "text-ink hover:bg-hover"
                          : "text-danger hover:bg-danger-soft",
                      )}
                    >
                      <Icon name={otherBlocked ? "user-check" : "ban"} size={16} />
                      {otherBlocked ? "Unblock member" : "Block member"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={leave}
                    className={cn(MENU_ITEM, "text-danger hover:bg-danger-soft")}
                  >
                    <Icon name="log-out" size={16} />
                    Leave conversation
                  </button>
                </div>
              </Popover>
            </div>

            <div
              ref={scrollRef}
              className="nx-scroll-y min-h-0 flex-1 space-y-3 px-3 py-4"
            >
              {!threadReady ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-1/2" />
                  <Skeleton className="ml-auto h-12 w-2/5" />
                  <Skeleton className="h-12 w-3/5" />
                </div>
              ) : thread.messages.length === 0 ? (
                <div className="grid h-full place-items-center">
                  <EmptyState
                    compact
                    icon="send"
                    title="No messages yet"
                    description="Be the first to send a message."
                  />
                </div>
              ) : (
                thread.messages.map((message) => {
                  const mine = message.sender_id === currentUserId;
                  const deleted = Boolean(message.deleted_at);
                  return (
                    <div
                      key={message.id}
                      className={cn(
                        "flex items-end gap-2",
                        mine ? "justify-end" : "justify-start",
                      )}
                    >
                      {!mine && activeDesc.isGroup && (
                        <Avatar
                          src={resolveMember(message.sender_id)?.avatar_url}
                          name={displayName(resolveMember(message.sender_id))}
                          seed={message.sender_id || message.id}
                          size="xs"
                          className="mb-5 shrink-0"
                        />
                      )}
                      <div className="group/msg max-w-[80%] min-w-0">
                        {!mine && activeDesc.isGroup && !deleted && (
                          <p className="mb-0.5 px-1 text-[0.6875rem] font-medium text-ink-muted">
                            {displayName(resolveMember(message.sender_id))}
                          </p>
                        )}
                        <div
                          className={cn(
                            "rounded-2xl px-3 py-2 text-[0.8125rem] leading-relaxed",
                            mine
                              ? "nx-selected rounded-br-sm"
                              : "nx-card rounded-bl-sm",
                            deleted && "italic text-ink-subtle",
                          )}
                        >
                          {deleted ? (
                            "Message deleted"
                          ) : (
                            <span className="break-words whitespace-pre-wrap">
                              {message.body}
                            </span>
                          )}
                        </div>
                        <div
                          className={cn(
                            "mt-0.5 flex items-center gap-2 px-1",
                            mine ? "justify-end" : "justify-start",
                          )}
                        >
                          <span className="text-[0.625rem] text-ink-subtle">
                            {formatRelative(message.created_at)}
                          </span>
                          {mine && !deleted && (
                            <button
                              type="button"
                              onClick={() => removeMessage(message)}
                              className="text-[0.625rem] text-ink-subtle opacity-0 transition-opacity hover:text-danger group-hover/msg:opacity-100 focus-visible:opacity-100"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                send();
              }}
              className="flex items-end gap-2 border-t border-line p-3"
            >
              <textarea
                ref={composerRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={onComposerKeyDown}
                rows={1}
                maxLength={4000}
                placeholder="Write a message…"
                aria-label="Message"
                className="nx-textarea max-h-32 min-h-[2.5rem] flex-1 resize-none"
              />
              <IconButton
                type="submit"
                icon="send"
                label="Send message"
                variant="brand"
                loading={sending}
                disabled={!draft.trim()}
              />
            </form>
          </>
        ) : (
          <div className="flex flex-1 flex-col">
            <div className="flex items-center border-b border-line px-3 py-2.5 lg:hidden">
              <IconButton
                icon="arrow-left"
                label="Back to conversations"
                size="sm"
                onClick={() => setActiveId(null)}
              />
            </div>
            <div className="grid flex-1 place-items-center p-6">
              <EmptyState
                icon="send"
                title="Your messages"
                description="Choose a conversation, or start a new one."
              />
            </div>
          </div>
        )}
      </section>

      {/* New direct message */}
      <Modal
        open={dmOpen}
        onClose={() => setDmOpen(false)}
        title="New message"
        description="Pick a member to start a private conversation."
        size="sm"
      >
        <div className="space-y-3">
          <SearchInput
            value={dmSearch}
            onChange={setDmSearch}
            placeholder="Search members"
            hotkey={false}
          />
          <div className="nx-scroll-y max-h-80 space-y-0.5 pr-1">
            {dmCandidates.length === 0 ? (
              <p className="px-1 py-6 text-center text-[0.8125rem] text-ink-muted">
                No members found.
              </p>
            ) : (
              dmCandidates.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  disabled={startingDm}
                  onClick={() => beginDirect(member.id)}
                  className="flex w-full items-center gap-3 rounded-control px-2.5 py-2 text-left transition-colors hover:bg-hover disabled:opacity-50"
                >
                  <Avatar
                    src={member.avatar_url}
                    name={displayName(member)}
                    seed={member.id}
                    size="sm"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.8125rem] font-medium text-ink">
                      {displayName(member)}
                    </span>
                    <span className="block truncate text-[0.72rem] text-ink-muted">
                      {humanizeToken(member.role)}
                    </span>
                  </span>
                  <Icon name="arrow-right" size={16} className="text-ink-subtle" />
                </button>
              ))
            )}
          </div>
        </div>
      </Modal>

      {/* New group */}
      <Modal
        open={groupOpen}
        onClose={() => setGroupOpen(false)}
        title="New group"
        description="Name your group and choose who to include."
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setGroupOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={creatingGroup}
              disabled={!groupTitle.trim() || groupPicks.size === 0}
              onClick={createGroup}
            >
              {groupPicks.size > 0
                ? `Create group (${groupPicks.size})`
                : "Create group"}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <TextInput
            label="Group name"
            value={groupTitle}
            onChange={(event) => setGroupTitle(event.target.value)}
            maxLength={120}
            placeholder="e.g. Event planning"
          />
          <div>
            <p className="mb-1.5 text-[0.75rem] font-medium text-ink-muted">
              Members
            </p>
            <SearchInput
              value={groupSearch}
              onChange={setGroupSearch}
              placeholder="Search members"
              hotkey={false}
            />
            <div className="nx-scroll-y mt-2 max-h-64 space-y-0.5 pr-1">
              {groupCandidates.length === 0 ? (
                <p className="px-1 py-6 text-center text-[0.8125rem] text-ink-muted">
                  No members found.
                </p>
              ) : (
                groupCandidates.map((member) => (
                  <label
                    key={member.id}
                    className="flex cursor-pointer items-center gap-3 rounded-control px-2.5 py-2 transition-colors hover:bg-hover"
                  >
                    <Checkbox
                      checked={groupPicks.has(member.id)}
                      onChange={() => togglePick(member.id)}
                    />
                    <Avatar
                      src={member.avatar_url}
                      name={displayName(member)}
                      seed={member.id}
                      size="sm"
                    />
                    <span className="min-w-0 flex-1 truncate text-[0.8125rem] text-ink">
                      {displayName(member)}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* Privacy */}
      <Modal
        open={privacyOpen}
        onClose={() => setPrivacyOpen(false)}
        title="Who can message you"
        description="This only controls who can start a new conversation. People you already talk to are unaffected."
        size="sm"
      >
        <div className="space-y-4">
          <SegmentedControl
            name="dm-privacy"
            value={privacy}
            onChange={savePrivacy}
            options={PRIVACY_OPTIONS}
            label="Who can message you"
          />
          <p className="text-[0.75rem] text-ink-muted">{PRIVACY_HELP[privacy]}</p>
        </div>
      </Modal>
    </div>
  );
}
