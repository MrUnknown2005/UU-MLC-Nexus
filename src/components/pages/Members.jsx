import { useMemo, useState } from "react";
import { SYSTEM_ROLE_DEFINITIONS } from "../../constants/roles";
import { Avatar } from "../ui/Avatar.jsx";
import { Badge } from "../ui/Badge.jsx";
import { Button } from "../ui/Button.jsx";
import { EmptyState } from "../ui/EmptyState.jsx";
import { Icon } from "../ui/Icon.jsx";
import { Panel } from "../ui/Panel.jsx";
import { SearchInput } from "../ui/SearchInput.jsx";
import { Select } from "../ui/Select.jsx";
import { StatCard } from "../ui/StatCard.jsx";
import { useConfirm } from "../ui/confirm-context.js";
import { useToast } from "../ui/toast-context.js";
import { roleLabel } from "../../lib/roles.js";
import { cn } from "../../lib/cn.js";
import { displayName, formatDate, formatNumber } from "../../lib/format.js";

/**
 * Member management — the screen where an administrator changes someone else's
 * access.
 *
 * Three things are different from the old version, all of them about
 * consequence.
 *
 * Deactivation now asks first, and the prompt itemises what actually happens:
 * the old build switched off an account on a single click with no undo offered
 * and no confirmation that it worked. `useMemberActions` deliberately stopped
 * owning that dialog so the page could name the person and the effect, which is
 * what this file does.
 *
 * Every action reports its outcome. The hook returns a boolean and toasts on
 * failure; success used to be silent, so an administrator had to re-read the
 * card to find out whether anything had happened.
 *
 * And a card in flight is disabled rather than clickable, so a slow network
 * cannot turn one approval into three.
 *
 * `canModifyTarget` mirrors the hook's own `blockedReason` guards. That is
 * deliberate duplication: the hook enforces, this decides what to even show —
 * a button that always refuses is worse than no button.
 */

/** Which bucket a member falls in. Pending is a role, not a flag, so it wins. */
function statusOf(member) {
  if (member.is_active === false) return "inactive";
  if (member.role === "guest") return "pending";
  return "active";
}

const STATUS_META = {
  pending: { label: "Awaiting approval", tone: "warn", icon: "clock" },
  inactive: { label: "Account inactive", tone: "danger", icon: "ban" },
  active: { label: "Active account", tone: "success", icon: "check-circle" },
};

function Members({
  members,
  currentUserId,
  currentUserRole,
  canEdit,
  roleDefinitions,
  onRoleChange,
  onToggleActive,
}) {
  const { toast } = useToast();
  const confirm = useConfirm();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [busyId, setBusyId] = useState(null);

  const availableRoles = roleDefinitions?.length
    ? roleDefinitions
    : SYSTEM_ROLE_DEFINITIONS;

  const roleName = (roleKey) => roleLabel(roleKey, availableRoles);

  const canModifyTarget = (member) => {
    if (currentUserRole === "head_admin") {
      return true;
    }

    if (currentUserRole === "administrator" && member.role === "head_admin") {
      return false;
    }

    return currentUserRole === "administrator";
  };

  const pendingMembers = useMemo(
    () => members.filter((member) => statusOf(member) === "pending"),
    [members]
  );

  // Counts for every filter, computed once from the whole list — a chip that
  // shows how much it will reveal is a filter you can use without guessing.
  const counts = useMemo(() => {
    const tally = { all: members.length, pending: 0, active: 0, inactive: 0 };
    for (const member of members) tally[statusOf(member)] += 1;
    return tally;
  }, [members]);

  const filteredMembers = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return members.filter((member) => {
      if (statusFilter !== "all" && statusOf(member) !== statusFilter) {
        return false;
      }

      if (!needle) return true;

      // Role is searchable by its display name, so "administrator" finds the
      // administrators even when the column holds `head_admin`.
      return [
        member.full_name,
        member.nickname,
        member.email,
        roleLabel(member.role, availableRoles),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [members, search, statusFilter, availableRoles]);

  const filtering = search.trim() !== "" || statusFilter !== "all";

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
  };

  const approve = async (member) => {
    setBusyId(member.id);
    const ok = await onRoleChange(member.id, "member");
    setBusyId(null);

    if (ok) {
      toast.success(`${displayName(member)} is now a member`, {
        description: "They have full member access from their next page load.",
      });
    }
  };

  const assignRole = async (member, nextRole) => {
    if (nextRole === member.role) return;

    setBusyId(member.id);
    const ok = await onRoleChange(member.id, nextRole);
    setBusyId(null);

    if (ok) {
      toast.success(
        `${displayName(member)} is now ${roleName(nextRole)}`
      );
    }
  };

  const setActive = async (member, nextActive) => {
    // Reactivating gives access back, so it goes straight through. Taking it
    // away is the one that needs a sentence about what happens next.
    if (!nextActive) {
      const confirmed = await confirm({
        title: `Deactivate ${displayName(member)}?`,
        description:
          "They lose access to Nexus until an administrator switches the account back on.",
        tone: "danger",
        confirmLabel: "Deactivate account",
        consequences: [
          "They are signed out the next time the app checks their session.",
          "Their points, tasks and history are kept exactly as they are.",
          "You can reactivate the account at any time from this screen.",
        ],
      });

      if (!confirmed) return;
    }

    setBusyId(member.id);
    const ok = await onToggleActive(member.id, nextActive);
    setBusyId(null);

    if (ok) {
      toast.success(
        nextActive
          ? `${displayName(member)} can sign in again`
          : `${displayName(member)} has been deactivated`
      );
    }
  };

  return (
    <div className="space-y-5">
      <Panel
        eyebrow="Administration"
        title="Member Management"
        description="Review join requests and manage member roles and account status."
        icon="user-check"
        bodyClassName="mt-1"
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Pending"
            value={formatNumber(counts.pending)}
            icon="clock"
            tone="warn"
            hint={counts.pending === 1 ? "1 request" : "requests to review"}
          />
          <StatCard
            label="Active"
            value={formatNumber(counts.active)}
            icon="user-check"
            tone="success"
            hint="full members"
          />
          <StatCard
            label="Inactive"
            value={formatNumber(counts.inactive)}
            icon="ban"
            tone="danger"
            hint="switched off"
          />
          <StatCard
            label="Total"
            value={formatNumber(counts.all)}
            icon="users"
            tone="brand"
            hint="accounts"
          />
        </div>
      </Panel>

      {pendingMembers.length > 0 && (
        <Panel
          eyebrow="Needs Review"
          title="Pending Join Requests"
          description="Approve a request to turn the account into a regular member."
          icon="user-plus"
          actions={<Badge tone="warn">{pendingMembers.length}</Badge>}
          bodyClassName="grid gap-3 md:grid-cols-2 xl:grid-cols-3"
        >
          {pendingMembers.map((member) => {
            const canModify =
              canEdit && member.id !== currentUserId && canModifyTarget(member);
            const name = displayName(member);

            return (
              <div key={member.id} className="nx-card p-4">
                <div className="flex items-center gap-3">
                  <Avatar
                    size="lg"
                    src={member.avatar_url}
                    name={name}
                    seed={member.id}
                  />

                  <div className="min-w-0">
                    <p className="truncate font-semibold">{name}</p>
                    {member.email && (
                      <p className="truncate text-[0.75rem] text-ink-subtle">
                        {member.email}
                      </p>
                    )}
                  </div>
                </div>

                <Button
                  variant="primary"
                  fullWidth
                  className="mt-4"
                  icon="user-check"
                  disabled={!canModify}
                  loading={busyId === member.id}
                  onClick={() => approve(member)}
                >
                  Approve &amp; Make Member
                </Button>
              </div>
            );
          })}
        </Panel>
      )}

      <Panel pad="md" bodyClassName="space-y-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          onClear={() => setSearch("")}
          placeholder="Search name, email, or role…"
          label="Search accounts"
          resultCount={filtering ? filteredMembers.length : undefined}
        />

        <div className="nx-scroll-x flex gap-2 pb-1">
          {[
            { key: "all", label: "All accounts", icon: "users" },
            { key: "pending", label: "Pending", icon: "clock" },
            { key: "active", label: "Active", icon: "user-check" },
            { key: "inactive", label: "Inactive", icon: "ban" },
          ].map((option) => (
            <button
              key={option.key}
              type="button"
              className="nx-chip"
              data-active={statusFilter === option.key}
              aria-pressed={statusFilter === option.key}
              onClick={() => setStatusFilter(option.key)}
            >
              <Icon name={option.icon} size={14} />
              {option.label}
              <span className="nx-num tabular-nums opacity-70">
                {counts[option.key]}
              </span>
            </button>
          ))}
        </div>

        <p className="text-[0.8125rem] text-ink-muted">
          Showing{" "}
          <span className="nx-num font-semibold text-ink tabular-nums">
            {filteredMembers.length}
          </span>{" "}
          of {members.length} accounts
        </p>
      </Panel>

      {filteredMembers.length === 0 ? (
        <Panel pad="lg">
          <EmptyState
            icon={filtering ? "search" : "users"}
            title={
              filtering
                ? "No accounts match your filters."
                : "There are no accounts yet."
            }
            description={
              filtering
                ? "Try a shorter search, or clear the filters to see every account."
                : "Accounts appear here as soon as someone signs up."
            }
            action={
              filtering ? (
                <Button variant="secondary" icon="close" onClick={clearFilters}>
                  Clear Filters
                </Button>
              ) : undefined
            }
          />
        </Panel>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredMembers.map((member) => {
            const isCurrentUser = member.id === currentUserId;
            const canModify =
              canEdit && !isCurrentUser && canModifyTarget(member);
            const status = statusOf(member);
            const meta = STATUS_META[status];
            const name = displayName(member);
            const busy = busyId === member.id;

            return (
              <li
                key={member.id}
                className={cn(
                  "nx-card nx-lift flex flex-col p-5",
                  status === "pending" && "nx-selected",
                  member.is_active === false && "opacity-80"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar
                      size="lg"
                      src={member.avatar_url}
                      name={name}
                      seed={member.id}
                    />

                    <div className="min-w-0">
                      <h3 className="truncate font-semibold">{name}</h3>

                      <p className="mt-0.5 truncate text-[0.75rem] font-semibold text-brand-text">
                        {roleName(member.role)}
                      </p>

                      <p
                        className={cn(
                          "mt-1 inline-flex items-center gap-1 text-[0.6875rem] font-semibold",
                          status === "inactive" && "text-danger",
                          status === "pending" && "text-warn",
                          status === "active" && "text-success"
                        )}
                      >
                        <Icon name={meta.icon} size={11} strokeWidth={2.5} />
                        {meta.label}
                      </p>
                    </div>
                  </div>

                  {status === "pending" && (
                    <Badge tone="warn" size="sm">
                      PENDING
                    </Badge>
                  )}
                </div>

                {/* Three facts an administrator checks before changing anything:
                    what they have contributed, whether they can get in, and how
                    long they have been here. */}
                <dl className="mt-5 grid grid-cols-3 gap-2">
                  <div className="nx-well p-3">
                    <dt className="nx-eyebrow">Points</dt>
                    <dd className="nx-num mt-1 font-semibold tabular-nums">
                      {formatNumber(member.points ?? 0)}
                    </dd>
                  </div>

                  <div className="nx-well p-3">
                    <dt className="nx-eyebrow">Status</dt>
                    <dd
                      className={cn(
                        "mt-1 font-semibold",
                        member.is_active === false
                          ? "text-danger"
                          : "text-success"
                      )}
                    >
                      {member.is_active === false ? "Inactive" : "Active"}
                    </dd>
                  </div>

                  <div className="nx-well p-3">
                    <dt className="nx-eyebrow">Joined</dt>
                    <dd className="mt-1 text-[0.8125rem] font-semibold">
                      {formatDate(member.created_at)}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4 flex flex-1 flex-wrap items-end gap-2">
                  {canModify && status === "pending" && (
                    <Button
                      variant="primary"
                      size="sm"
                      icon="user-check"
                      className="min-w-36 flex-1"
                      loading={busy}
                      onClick={() => approve(member)}
                    >
                      Approve
                    </Button>
                  )}

                  {canModify && member.role !== "guest" && member.is_active && (
                    <Select
                      aria-label={`Role for ${name}`}
                      value={member.role}
                      disabled={busy}
                      onChange={(event) => assignRole(member, event.target.value)}
                      fieldClassName="min-w-36 flex-1"
                      options={availableRoles
                        .filter(
                          (role) =>
                            isCurrentUser ||
                            role.role_key !== "head_admin" ||
                            currentUserRole === "head_admin"
                        )
                        .map((role) => ({
                          value: role.role_key,
                          label: role.name || roleName(role.role_key),
                        }))}
                    />
                  )}

                  {canModify && (
                    <Button
                      variant={member.is_active ? "danger-soft" : "success-soft"}
                      size="sm"
                      icon={member.is_active ? "user-x" : "user-check"}
                      loading={busy}
                      onClick={() => setActive(member, !member.is_active)}
                    >
                      {member.is_active ? "Deactivate" : "Reactivate"}
                    </Button>
                  )}

                  {isCurrentUser && (
                    <p className="flex w-full items-center justify-center gap-1.5 text-[0.75rem] font-semibold text-brand-text">
                      <Icon name="user" size={13} />
                      This is your account
                    </p>
                  )}

                  {/* Said out loud rather than shown as a dead button: the
                      restriction is the answer to "why can't I edit this?" */}
                  {!canModify &&
                    !isCurrentUser &&
                    member.role === "head_admin" &&
                    currentUserRole === "administrator" && (
                      <p className="flex w-full items-center justify-center gap-1.5 text-[0.75rem] text-ink-subtle">
                        <Icon name="lock" size={12} />
                        Protected Head Admin account
                      </p>
                    )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default Members;
