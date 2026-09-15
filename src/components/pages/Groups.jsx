import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "../ui/Avatar.jsx";
import { Badge } from "../ui/Badge.jsx";
import { Button } from "../ui/Button.jsx";
import { Checkbox } from "../ui/Checkbox.jsx";
import { EmptyState } from "../ui/EmptyState.jsx";
import { Icon } from "../ui/Icon.jsx";
import { IconButton } from "../ui/IconButton.jsx";
import { Panel } from "../ui/Panel.jsx";
import { SearchInput } from "../ui/SearchInput.jsx";
import { Sheet } from "../ui/Sheet.jsx";
import { Skeleton } from "../ui/Skeleton.jsx";
import { StatCard } from "../ui/StatCard.jsx";
import { TextArea } from "../ui/TextArea.jsx";
import { TextInput } from "../ui/TextInput.jsx";
import { CountUp } from "../ui/CountUp.jsx";
import { useConfirm } from "../ui/confirm-context.js";
import { useToast } from "../ui/toast-context.js";
import { useRankFlip } from "../../hooks/useRankFlip.js";
import {
  createGroup,
  deleteGroup,
  fetchCompletedTodos,
  fetchGroupMembers,
  fetchGroups,
  saveGroupMembers,
  subscribeToGroupChanges,
  updateGroup,
} from "../../services/groupService.js";
import { cn } from "../../lib/cn.js";
import { roleLabel } from "../../lib/roles.js";
import { countLabel, displayName, formatNumber, ordinal } from "../../lib/format.js";

/**
 * Groups — assign people to squads and watch the standings move as tasks land.
 *
 * Everything here is derived, nothing stored. A member's *task points* are the
 * sum of `todos.points` over the tasks they completed (`completed_by`), and
 * their *completions* are the count of those tasks. A group rolls those up over
 * everyone assigned to it — and because membership is many-to-many, one person's
 * completion credits every group they belong to. Standings are recomputed in
 * this component from three raw lists (`groups`, `group_members`, completed
 * `todos`), so there are no counters to drift out of sync with the database.
 *
 * Deliberately *not* the admin points leaderboard: `profiles.points` is
 * admin-awarded (self-award is blocked to stop gaming), so task points live as
 * their own metric rather than feeding that board.
 *
 * The page fetches its own data with a realtime subscription — like Todo, it is
 * not part of the shared dashboard load. Before the `20260914000000_groups.sql`
 * migration is applied the tables (and the `todos.points` column) do not exist;
 * the loader recognises that and shows a friendly "not set up yet" state instead
 * of crashing.
 *
 * The group standings are a single column, which is the one place `useRankFlip`
 * fits (it slides rows vertically) — exactly like Overview's leaderboard. The
 * member card grids elsewhere can't use it, which is why they only stagger.
 */

// Semantic accent tokens rather than free-form hex: keeps a wall of groups on
// the app's palette instead of turning into a rainbow, and each is a real
// design token so soft/solid variants already exist.
const GROUP_TONES = {
  brand: { dot: "bg-brand", bar: "bg-brand", chip: "bg-brand-soft text-brand-text" },
  violet: { dot: "bg-violet", bar: "bg-violet", chip: "bg-violet-soft text-violet" },
  info: { dot: "bg-info", bar: "bg-info", chip: "bg-info-soft text-info" },
  success: { dot: "bg-success", bar: "bg-success", chip: "bg-success-soft text-success" },
  warn: { dot: "bg-warn", bar: "bg-warn", chip: "bg-warn-soft text-warn" },
};
const GROUP_TONE_KEYS = Object.keys(GROUP_TONES);
const toneOf = (color) => GROUP_TONES[color] ?? GROUP_TONES.brand;

/**
 * True when a query failed because the Groups schema isn't there yet — either a
 * missing table (`groups`/`group_members`) or the missing `todos.points`
 * column. Covers the Postgres SQLSTATEs and the PostgREST schema-cache codes,
 * with a message fallback for wording that skips the codes.
 */
function isSchemaMissingError(error) {
  if (!error) return false;
  const code = error.code || "";
  if (["42P01", "42703", "PGRST205", "PGRST204", "PGRST202"].includes(code)) {
    return true;
  }
  const message = (error.message || "").toLowerCase();
  return /schema cache|does not exist|find the table|could not find the/.test(
    message,
  );
}

function Groups({ members = [], currentUserId, canManage = false, onLogAction }) {
  const confirm = useConfirm();
  const { toast } = useToast();

  const [groups, setGroups] = useState([]);
  const [groupMembers, setGroupMembers] = useState([]);
  const [completedTodos, setCompletedTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notSetUp, setNotSetUp] = useState(false);

  const [expandedId, setExpandedId] = useState(null);
  const [busyGroupId, setBusyGroupId] = useState(null);

  // Create / edit form (a single Panel that switches on `formMode`).
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [formGroup, setFormGroup] = useState(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formColor, setFormColor] = useState("brand");
  const [formError, setFormError] = useState("");
  const [savingForm, setSavingForm] = useState(false);

  // Manage-members sheet.
  const [manageGroupId, setManageGroupId] = useState(null);
  const [draftMemberIds, setDraftMemberIds] = useState(() => new Set());
  const [memberSearch, setMemberSearch] = useState("");
  const [savingMembers, setSavingMembers] = useState(false);

  // Guards the async loader against applying state after unmount / a
  // StrictMode remount, re-armed by the effect below.
  const mountedRef = useRef(true);

  const loadGroups = useCallback(async () => {
    const [groupsRes, membersRes, todosRes] = await Promise.all([
      fetchGroups(),
      fetchGroupMembers(),
      fetchCompletedTodos(),
    ]);

    if (!mountedRef.current) return;

    const firstError = groupsRes.error || membersRes.error || todosRes.error;

    // Tables (or the points column) aren't there yet — degrade gracefully
    // rather than spilling a red error the club can do nothing about.
    if (firstError && isSchemaMissingError(firstError)) {
      setNotSetUp(true);
      setGroups([]);
      setGroupMembers([]);
      setCompletedTodos([]);
      setLoading(false);
      return;
    }

    if (firstError) {
      console.error("Groups load error:", firstError);
    }

    setNotSetUp(false);
    setGroups(groupsRes.data || []);
    setGroupMembers(membersRes.data || []);
    setCompletedTodos(todosRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    // Intentional fetch-on-mount, paired with the realtime subscription below;
    // state is only set after the awaited load resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadGroups();

    const unsubscribe = subscribeToGroupChanges(() => {
      loadGroups();
    });

    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, [loadGroups]);

  // Members the dashboard already ranked (active, non-guest) are the pool that
  // can be assigned; sorted once for the assignment list.
  const assignableMembers = useMemo(
    () =>
      [...members].sort((a, b) =>
        displayName(a).localeCompare(displayName(b)),
      ),
    [members],
  );

  const memberById = useMemo(
    () => new Map(members.map((member) => [member.id, member])),
    [members],
  );

  // member id -> { taskPoints, completions } from the completed tasks they own.
  const statsByMember = useMemo(() => {
    const map = new Map();
    for (const todo of completedTodos) {
      const uid = todo.completed_by;
      if (!uid) continue;
      const entry = map.get(uid) || { taskPoints: 0, completions: 0 };
      entry.taskPoints += Number(todo.points ?? 0);
      entry.completions += 1;
      map.set(uid, entry);
    }
    return map;
  }, [completedTodos]);

  // group id -> [member id]. The raw membership rows are the source of truth for
  // counts and roll-ups, so a since-deactivated member still counts historically.
  const membersByGroup = useMemo(() => {
    const map = new Map();
    for (const row of groupMembers) {
      const list = map.get(row.group_id) || [];
      list.push(row.member_id);
      map.set(row.group_id, list);
    }
    return map;
  }, [groupMembers]);

  const standings = useMemo(() => {
    const rows = groups.map((group) => {
      const memberIds = membersByGroup.get(group.id) || [];
      let taskPoints = 0;
      let completions = 0;
      for (const id of memberIds) {
        const stat = statsByMember.get(id);
        if (stat) {
          taskPoints += stat.taskPoints;
          completions += stat.completions;
        }
      }
      return {
        group,
        memberIds,
        memberCount: memberIds.length,
        taskPoints,
        completions,
      };
    });

    rows.sort(
      (a, b) =>
        b.taskPoints - a.taskPoints ||
        b.completions - a.completions ||
        a.group.name.localeCompare(b.group.name),
    );

    return rows;
  }, [groups, membersByGroup, statsByMember]);

  const maxPoints = useMemo(
    () => standings.reduce((max, row) => Math.max(max, row.taskPoints), 0),
    [standings],
  );

  // FLIP order: the ordered id/points list tells the hook what moved and what
  // changed so rows slide to their new rank and the changed one flashes.
  const registerRow = useRankFlip(
    standings.map((row) => ({ id: row.group.id, value: row.taskPoints })),
  );

  const assignedMemberCount = useMemo(
    () => new Set(groupMembers.map((row) => row.member_id)).size,
    [groupMembers],
  );

  const totalTaskPoints = useMemo(
    () =>
      completedTodos.reduce(
        (sum, todo) => (todo.completed_by ? sum + Number(todo.points ?? 0) : sum),
        0,
      ),
    [completedTodos],
  );

  const openCreate = () => {
    setFormMode("create");
    setFormGroup(null);
    setFormName("");
    setFormDescription("");
    setFormColor("brand");
    setFormError("");
    setFormOpen(true);
  };

  const openEdit = (group) => {
    setFormMode("edit");
    setFormGroup(group);
    setFormName(group.name || "");
    setFormDescription(group.description || "");
    setFormColor(GROUP_TONES[group.color] ? group.color : "brand");
    setFormError("");
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setFormGroup(null);
    setFormName("");
    setFormDescription("");
    setFormColor("brand");
    setFormError("");
  };

  const submitForm = async (event) => {
    event.preventDefault();
    setFormError("");

    const name = formName.trim();
    if (!name) {
      setFormError("Please name the group.");
      return;
    }

    setSavingForm(true);
    try {
      const patch = {
        name,
        description: formDescription.trim(),
        color: formColor || null,
      };

      if (formMode === "edit" && formGroup) {
        const { error } = await updateGroup(formGroup.id, patch);
        if (error) {
          setFormError(error.message);
          return;
        }
        if (onLogAction) {
          await onLogAction({
            action: "GROUP_UPDATED",
            details: `Edited group: ${name}`,
          });
        }
        toast.success(`"${name}" updated`);
      } else {
        const { error } = await createGroup({ ...patch, created_by: currentUserId });
        if (error) {
          setFormError(error.message);
          return;
        }
        if (onLogAction) {
          await onLogAction({
            action: "GROUP_CREATED",
            details: `Created group: ${name}`,
          });
        }
        toast.success(`"${name}" created`);
      }

      closeForm();
      await loadGroups();
    } finally {
      setSavingForm(false);
    }
  };

  const removeGroup = async (group) => {
    const confirmed = await confirm({
      title: `Delete "${group.name}"?`,
      description:
        "The group and everyone's membership in it are removed. Task points already earned by members are unaffected.",
      tone: "danger",
      confirmLabel: "Delete group",
      requireText: group.name,
      consequences: [
        "Every member is unassigned from this group.",
        "It disappears from the standings for everyone.",
        "This cannot be undone — the group would have to be created again.",
      ],
    });

    if (!confirmed) return;

    setBusyGroupId(group.id);
    const { error } = await deleteGroup(group.id);

    if (error) {
      setBusyGroupId(null);
      toast.error("Could not delete the group", { description: error.message });
      return;
    }

    if (onLogAction) {
      await onLogAction({
        action: "GROUP_DELETED",
        details: `Deleted group: ${group.name}`,
      });
    }

    if (expandedId === group.id) setExpandedId(null);
    await loadGroups();
    setBusyGroupId(null);
    toast.success(`"${group.name}" deleted`);
  };

  const openManage = (group) => {
    setManageGroupId(group.id);
    setDraftMemberIds(new Set(membersByGroup.get(group.id) || []));
    setMemberSearch("");
  };

  const closeManage = () => {
    setManageGroupId(null);
    setMemberSearch("");
  };

  const toggleDraft = (memberId) => {
    setDraftMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
  };

  const manageGroup = groups.find((group) => group.id === manageGroupId) || null;

  const filteredAssignable = useMemo(() => {
    const needle = memberSearch.trim().toLowerCase();
    if (!needle) return assignableMembers;
    return assignableMembers.filter((member) =>
      [member.full_name, member.nickname]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(needle)),
    );
  }, [assignableMembers, memberSearch]);

  const saveMembers = async () => {
    if (!manageGroup) return;

    setSavingMembers(true);
    const current = membersByGroup.get(manageGroup.id) || [];
    const { error } = await saveGroupMembers(
      manageGroup.id,
      [...draftMemberIds],
      current,
      currentUserId,
    );
    setSavingMembers(false);

    if (error) {
      toast.error("Could not update members", { description: error.message });
      return;
    }

    if (onLogAction) {
      await onLogAction({
        action: "GROUP_MEMBERS_UPDATED",
        details: `Updated members of group: ${manageGroup.name}`,
      });
    }

    const name = manageGroup.name;
    closeManage();
    await loadGroups();
    toast.success(`Members of "${name}" updated`);
  };

  if (loading) {
    return (
      <div className="space-y-5" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading groups…</span>

        <Panel pad="md" bodyClassName="space-y-3">
          <Skeleton className="h-6 w-40" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((cell) => (
              <Skeleton key={cell} className="h-20 w-full" />
            ))}
          </div>
        </Panel>

        <div className="space-y-3">
          {[0, 1, 2].map((row) => (
            <div key={row} className="nx-card space-y-2.5 p-5">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (notSetUp) {
    return (
      <Panel pad="lg">
        <EmptyState
          icon="grid"
          title="Groups aren't set up yet"
          description={
            canManage
              ? "The Groups tables haven't been created in the database. Apply the 20260914000000_groups.sql migration on the next Supabase connection, and this page fills in on its own."
              : "This feature is being set up. Check back soon and your squads and standings will appear here."
          }
        />
      </Panel>
    );
  }

  return (
    <div className="space-y-5">
      <Panel
        eyebrow="Teams"
        title="Groups"
        description={`${countLabel(groups.length, "group")} · ${countLabel(
          assignedMemberCount,
          "member",
        )} assigned`}
        icon="grid"
        actions={
          canManage && (
            <Button variant="primary" size="sm" icon="plus" onClick={openCreate}>
              New group
            </Button>
          )
        }
        bodyClassName="space-y-4"
      >
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatCard
            className="nx-rise"
            label="Groups"
            value={<CountUp value={groups.length} format={formatNumber} />}
            icon="grid"
            tone="brand"
            hint="Active squads"
          />
          <StatCard
            className="nx-rise [animation-delay:60ms]"
            label="Members assigned"
            value={<CountUp value={assignedMemberCount} format={formatNumber} />}
            icon="users"
            tone="violet"
            hint="Across all groups"
          />
          <StatCard
            className="nx-rise [animation-delay:120ms]"
            label="Tasks completed"
            value={<CountUp value={completedTodos.length} format={formatNumber} />}
            icon="check-circle"
            tone="success"
            hint="Club-wide"
          />
          <StatCard
            className="nx-rise [animation-delay:180ms]"
            label="Task points"
            value={<CountUp value={totalTaskPoints} format={formatNumber} />}
            icon="trophy"
            tone="info"
            hint="Earned from tasks"
          />
        </div>
      </Panel>

      {canManage && formOpen && (
        <Panel
          eyebrow={formMode === "edit" ? "Editing" : "New group"}
          title={formMode === "edit" ? "Edit group" : "Create a group"}
          icon={formMode === "edit" ? "pencil" : "plus"}
          actions={
            <IconButton
              icon="close"
              label="Close the group editor"
              size="sm"
              onClick={closeForm}
            />
          }
        >
          <form onSubmit={submitForm} className="space-y-4" noValidate>
            <TextInput
              label="Group name"
              required
              value={formName}
              onChange={(event) => {
                setFormName(event.target.value);
                if (formError) setFormError("");
              }}
              disabled={savingForm}
              error={formError || undefined}
            />

            <TextArea
              label="Description"
              optional
              hint="What is this group for? Shown to everyone."
              value={formDescription}
              onChange={(event) => setFormDescription(event.target.value)}
              rows={3}
              disabled={savingForm}
            />

            <div>
              <p className="nx-eyebrow mb-2">Accent</p>
              <div className="flex flex-wrap gap-2.5">
                {GROUP_TONE_KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFormColor(key)}
                    aria-pressed={formColor === key}
                    aria-label={`${key} accent`}
                    disabled={savingForm}
                    className={cn(
                      "h-8 w-8 rounded-full border-2 transition",
                      "focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
                      toneOf(key).dot,
                      formColor === key
                        ? "border-ink"
                        : "border-transparent opacity-60 hover:opacity-100",
                    )}
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <Button
                type="submit"
                variant="primary"
                icon="check"
                loading={savingForm}
              >
                {formMode === "edit" ? "Save changes" : "Create group"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={closeForm}
                disabled={savingForm}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Panel>
      )}

      {standings.length === 0 ? (
        <Panel pad="lg">
          <EmptyState
            icon="grid"
            title="No groups yet"
            description={
              canManage
                ? "Create a group, assign a few members, and their completed tasks start rolling up here."
                : "Once an admin creates groups and assigns members, the standings show up here."
            }
            action={
              canManage ? (
                <Button variant="primary" icon="plus" onClick={openCreate}>
                  New group
                </Button>
              ) : undefined
            }
          />
        </Panel>
      ) : (
        <section>
          <div className="mb-3.5 flex items-end justify-between gap-3">
            <div>
              <p className="nx-eyebrow">Standings</p>
              <h3 className="nx-display mt-1 text-lg">Group leaderboard</h3>
            </div>
            <Badge tone="violet">{countLabel(standings.length, "group")}</Badge>
          </div>

          <ul className="space-y-3">
            {standings.map((row, index) => {
              const { group } = row;
              const tone = toneOf(group.color);
              const expanded = expandedId === group.id;
              const isCurrentUserInGroup = row.memberIds.includes(currentUserId);
              const share =
                maxPoints > 0 ? Math.max(4, (row.taskPoints / maxPoints) * 100) : 0;

              const memberRows = expanded
                ? row.memberIds
                    .map((id) => {
                      const member =
                        memberById.get(id) || {
                          id,
                          full_name: "Former member",
                          role: null,
                        };
                      const stat =
                        statsByMember.get(id) || { taskPoints: 0, completions: 0 };
                      return { member, ...stat };
                    })
                    .sort(
                      (a, b) =>
                        b.taskPoints - a.taskPoints ||
                        b.completions - a.completions ||
                        displayName(a.member).localeCompare(displayName(b.member)),
                    )
                : [];

              return (
                <li
                  key={group.id}
                  ref={registerRow(group.id)}
                  className="nx-rise nx-card overflow-hidden"
                  style={{ animationDelay: `${index * 70}ms` }}
                >
                  <div className="flex items-center gap-3 p-4 sm:p-5">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedId((current) =>
                          current === group.id ? null : group.id,
                        )
                      }
                      aria-expanded={expanded}
                      aria-controls={`group-panel-${group.id}`}
                      className={cn(
                        "flex min-w-0 flex-1 items-center gap-3 rounded-control text-left",
                        "focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
                      )}
                    >
                      <span
                        className={cn(
                          "grid h-8 w-8 shrink-0 place-items-center rounded-[9px] text-xs font-semibold tabular-nums",
                          tone.chip,
                        )}
                        aria-hidden="true"
                      >
                        {index + 1}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span
                            className={cn(
                              "h-2.5 w-2.5 shrink-0 rounded-full",
                              tone.dot,
                            )}
                            aria-hidden="true"
                          />
                          <span className="truncate text-[0.9375rem] font-semibold">
                            {group.name}
                          </span>
                          {isCurrentUserInGroup && (
                            <Badge tone="brand" size="sm">
                              Your group
                            </Badge>
                          )}
                          <Icon
                            name="chevron-down"
                            size={15}
                            className={cn(
                              "shrink-0 text-ink-subtle transition-transform duration-[var(--t-fast)]",
                              !expanded && "-rotate-90",
                            )}
                          />
                        </span>

                        <span className="mt-1 block text-[0.75rem] text-ink-muted">
                          {countLabel(row.memberCount, "member")} ·{" "}
                          {countLabel(row.completions, "task")} done
                        </span>

                        <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-surface-3">
                          <span
                            className={cn(
                              "nx-bar-grow block h-full rounded-full",
                              tone.bar,
                            )}
                            style={{
                              "--bar-w": `${share}%`,
                              animationDelay: `${index * 70 + 130}ms`,
                            }}
                            aria-hidden="true"
                          />
                        </span>
                      </span>

                      <span className="shrink-0 pl-1 text-right">
                        <span className="nx-num block text-xl leading-none font-semibold tabular-nums">
                          <CountUp
                            value={row.taskPoints}
                            format={formatNumber}
                            animateOnMount={false}
                          />
                        </span>
                        <span className="nx-eyebrow mt-1 block">pts</span>
                      </span>
                      <span className="sr-only">
                        ranked {ordinal(index + 1)}
                      </span>
                    </button>

                    {canManage && (
                      <div className="flex shrink-0 gap-1">
                        <IconButton
                          icon="users"
                          label={`Manage members of "${group.name}"`}
                          size="md"
                          disabled={busyGroupId === group.id}
                          onClick={() => openManage(group)}
                        />
                        <IconButton
                          icon="pencil"
                          label={`Edit "${group.name}"`}
                          size="md"
                          disabled={busyGroupId === group.id}
                          onClick={() => openEdit(group)}
                        />
                        <IconButton
                          icon="trash"
                          label={`Delete "${group.name}"`}
                          size="md"
                          variant="danger"
                          disabled={busyGroupId === group.id}
                          onClick={() => removeGroup(group)}
                        />
                      </div>
                    )}
                  </div>

                  <div
                    id={`group-panel-${group.id}`}
                    hidden={!expanded}
                    className="border-t border-line"
                  >
                    {group.description?.trim() && (
                      <p className="px-4 pt-3 text-[0.8125rem] leading-relaxed text-ink-muted sm:px-5">
                        {group.description}
                      </p>
                    )}

                    {memberRows.length === 0 ? (
                      <p className="px-4 py-4 text-[0.8125rem] text-ink-subtle sm:px-5">
                        No members assigned yet.
                      </p>
                    ) : (
                      <ul className="divide-y divide-line py-1">
                        {memberRows.map(({ member, taskPoints, completions }) => {
                          const isMe = member.id === currentUserId;
                          return (
                            <li
                              key={member.id}
                              className="flex items-center gap-3 px-4 py-2.5 sm:px-5"
                            >
                              <Avatar
                                size="sm"
                                src={member.avatar_url}
                                name={displayName(member)}
                                seed={member.id}
                                ring={isMe}
                              />
                              <div className="min-w-0 flex-1">
                                <p className="flex items-center gap-1.5 truncate text-[0.8125rem] font-semibold">
                                  <span className="truncate">
                                    {displayName(member)}
                                  </span>
                                  {isMe && (
                                    <Badge tone="brand" size="sm">
                                      You
                                    </Badge>
                                  )}
                                </p>
                                <p className="text-[0.75rem] text-ink-subtle">
                                  {countLabel(completions, "task")} done
                                </p>
                              </div>
                              <span className="nx-num shrink-0 text-sm font-semibold tabular-nums">
                                <CountUp
                                  value={taskPoints}
                                  format={formatNumber}
                                  animateOnMount={false}
                                />
                                <span className="ml-1 text-[0.6875rem] font-normal text-ink-subtle">
                                  pts
                                </span>
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <Sheet
        open={Boolean(manageGroup)}
        onClose={closeManage}
        side="right"
        title={manageGroup ? `Members · ${manageGroup.name}` : "Members"}
        width="22rem"
      >
        {manageGroup && (
          <div className="flex h-full flex-col">
            <div className="shrink-0 space-y-2 border-b border-line p-4">
              <SearchInput
                value={memberSearch}
                onChange={setMemberSearch}
                onClear={() => setMemberSearch("")}
                placeholder="Search members…"
                label="Search members"
              />
              <p className="text-[0.75rem] text-ink-subtle">
                {countLabel(draftMemberIds.size, "member")} selected
              </p>
            </div>

            {assignableMembers.length === 0 ? (
              <div className="min-h-0 flex-1 p-4">
                <EmptyState
                  compact
                  icon="users"
                  title="No members to assign"
                  description="Approved, active members show up here once they exist."
                />
              </div>
            ) : (
              <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-3">
                {filteredAssignable.map((member) => (
                  <li key={member.id}>
                    <Checkbox
                      label={displayName(member)}
                      description={roleLabel(member.role)}
                      checked={draftMemberIds.has(member.id)}
                      disabled={savingMembers}
                      onChange={() => toggleDraft(member.id)}
                      className="rounded-control px-2 py-1.5 hover:bg-well"
                    />
                  </li>
                ))}
                {filteredAssignable.length === 0 && (
                  <li className="px-2 py-6 text-center text-[0.8125rem] text-ink-subtle">
                    No members match your search.
                  </li>
                )}
              </ul>
            )}

            <div className="flex shrink-0 gap-2.5 border-t border-line p-4">
              <Button
                variant="primary"
                icon="check"
                loading={savingMembers}
                onClick={saveMembers}
              >
                Save members
              </Button>
              <Button
                variant="ghost"
                onClick={closeManage}
                disabled={savingMembers}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}

export default Groups;
