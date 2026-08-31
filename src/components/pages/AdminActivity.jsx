import { useMemo, useState } from "react";
import { Avatar } from "../ui/Avatar.jsx";
import { Badge } from "../ui/Badge.jsx";
import { Button } from "../ui/Button.jsx";
import { EmptyState } from "../ui/EmptyState.jsx";
import { Icon } from "../ui/Icon.jsx";
import { Panel } from "../ui/Panel.jsx";
import { SearchInput } from "../ui/SearchInput.jsx";
import { Select } from "../ui/Select.jsx";
import { useConfirm } from "../ui/confirm-context.js";
import { useToast } from "../ui/toast-context.js";
import { useNow } from "../../hooks/useNow.js";
import { roleLabel } from "../../lib/roles.js";
import { cn } from "../../lib/cn.js";
import {
  countLabel,
  displayName,
  formatDate,
  formatDateTime,
  formatNumber,
  formatRelative,
  humanizeToken,
} from "../../lib/format.js";

/**
 * The audit trail.
 *
 * An audit log is read two ways: scanning for "what happened recently" and
 * hunting for "who did that specific thing". So it is grouped by day for the
 * first and filtered three ways for the second, with the filters showing how
 * many entries they matched rather than leaving you to count.
 *
 * The old version tinted the action pill five colours by keyword sniffing on the
 * action string. The tint now means one thing only — destructive, elevating,
 * routine — because that is the distinction someone auditing actually needs.
 */

/** Tone by consequence, not by subject area. */
function actionTone(action) {
  const value = String(action || "");

  if (/WIPE|DELETE|DEACTIVATED|REMOVE/.test(value)) return "danger";
  if (/ROLE|PROMOT|PERMISSION/.test(value)) return "violet";
  if (/RESET/.test(value)) return "warn";
  if (/POINT/.test(value)) return "brand";
  if (/REACTIVATED|CREATE|ADD/.test(value)) return "success";

  return "neutral";
}

function actionIcon(action) {
  const value = String(action || "");

  if (/WIPE|DELETE|REMOVE/.test(value)) return "trash";
  if (/DEACTIVATED/.test(value)) return "user-x";
  if (/REACTIVATED/.test(value)) return "user-check";
  if (/ROLE|PROMOT|PERMISSION/.test(value)) return "shield-check";
  if (/RESET/.test(value)) return "refresh";
  if (/POINT/.test(value)) return "trophy";
  if (/NEWS/.test(value)) return "newspaper";
  if (/TODO|TASK/.test(value)) return "tasks";
  if (/PROFILE/.test(value)) return "user";

  return "history";
}

/** Local calendar day, so "Today" means today where the reader is sitting. */
function dayKey(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "unknown";
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function dayLabel(value, now) {
  if (!value) return "Undated";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Undated";

  if (dayKey(value) === dayKey(now)) return "Today";
  if (dayKey(value) === dayKey(now - 86_400_000)) return "Yesterday";

  return formatDate(value);
}

function Entry({ item, actor, target, now }) {
  const tone = actionTone(item.action);

  return (
    <li className="relative flex gap-3 pl-1">
      {/* The rail: an audit trail reads as a sequence, so it looks like one. */}
      <span
        aria-hidden="true"
        className="absolute top-11 bottom-0 left-[1.4375rem] w-px bg-line"
      />

      <span className="relative shrink-0">
        <Avatar
          size="sm"
          src={actor?.avatar_url}
          name={actor ? displayName(actor) : "Unknown"}
          seed={item.admin_id ?? item.id}
        />
        <span
          className={cn(
            "absolute -right-1 -bottom-1 grid h-[1.125rem] w-[1.125rem] place-items-center rounded-full border border-surface",
            tone === "danger" && "bg-danger text-white",
            tone === "violet" && "bg-violet text-white",
            tone === "warn" && "bg-warn text-white",
            tone === "brand" && "bg-brand text-brand-ink",
            tone === "success" && "bg-success text-white",
            tone === "neutral" && "bg-surface-3 text-ink-muted"
          )}
        >
          <Icon name={actionIcon(item.action)} size={10} strokeWidth={2.5} />
        </span>
      </span>

      <div className="nx-card min-w-0 flex-1 p-3.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[0.8125rem] font-semibold">
            {actor ? displayName(actor) : "Unknown admin"}
          </span>

          {actor?.role && (
            <span className="text-[0.6875rem] text-ink-subtle">
              {roleLabel(actor.role)}
            </span>
          )}

          <Badge tone={tone} size="sm">
            {humanizeToken(item.action || "unknown")}
          </Badge>
        </div>

        {target && (
          <p className="mt-2 flex items-center gap-1.5 text-[0.8125rem] text-ink-muted">
            <Icon name="arrow-right" size={13} className="shrink-0" />
            <span className="font-medium text-ink">{displayName(target)}</span>
          </p>
        )}

        {item.details && (
          <p className="mt-1.5 text-[0.8125rem] leading-relaxed whitespace-pre-wrap text-ink-muted">
            {item.details}
          </p>
        )}

        {item.created_at && (
          <time
            dateTime={item.created_at}
            title={formatDateTime(item.created_at)}
            className="mt-2.5 block text-[0.6875rem] text-ink-subtle"
          >
            {formatRelative(item.created_at, now)}
          </time>
        )}
      </div>
    </li>
  );
}

function AdminActivity({ activityLog = [], members = [], isHeadAdmin, onWipe }) {
  const { toast } = useToast();
  const confirm = useConfirm();
  const now = useNow();

  const [search, setSearch] = useState("");
  const [action, setAction] = useState("all");
  const [actor, setActor] = useState("all");
  const [wiping, setWiping] = useState(false);

  // One lookup table instead of a `.find()` per row per render: the log is the
  // longest list in the app and every entry resolves two members.
  const byId = useMemo(
    () => new Map(members.map((member) => [member.id, member])),
    [members]
  );

  const actionOptions = useMemo(() => {
    const counts = new Map();

    for (const item of activityLog) {
      if (!item.action) continue;
      counts.set(item.action, (counts.get(item.action) ?? 0) + 1);
    }

    return [
      { value: "all", label: `All actions (${activityLog.length})` },
      ...[...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([value, count]) => ({
          value,
          label: `${humanizeToken(value)} (${count})`,
        })),
    ];
  }, [activityLog]);

  const actorOptions = useMemo(() => {
    const counts = new Map();

    for (const item of activityLog) {
      if (!item.admin_id) continue;
      counts.set(item.admin_id, (counts.get(item.admin_id) ?? 0) + 1);
    }

    return [
      { value: "all", label: "Everyone" },
      ...[...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([id, count]) => ({
          value: id,
          label: `${byId.get(id) ? displayName(byId.get(id)) : "Unknown admin"} (${count})`,
        })),
    ];
  }, [activityLog, byId]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return activityLog.filter((item) => {
      if (action !== "all" && item.action !== action) return false;
      if (actor !== "all" && item.admin_id !== actor) return false;
      if (!needle) return true;

      const actorRecord = byId.get(item.admin_id);
      const targetRecord = byId.get(item.target_user_id);

      return [
        actorRecord ? displayName(actorRecord) : "",
        targetRecord ? displayName(targetRecord) : "",
        item.action ? humanizeToken(item.action) : "",
        item.details ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [activityLog, action, actor, search, byId]);

  // Grouped by day so the list reads as a history rather than a flat dump.
  const days = useMemo(() => {
    const groups = new Map();

    for (const item of filtered) {
      const key = dayKey(item.created_at);
      const list = groups.get(key) ?? { label: dayLabel(item.created_at, now), items: [] };
      list.items.push(item);
      groups.set(key, list);
    }

    return [...groups.values()];
  }, [filtered, now]);

  const todayCount = useMemo(
    () =>
      activityLog.filter((item) => dayKey(item.created_at) === dayKey(now))
        .length,
    [activityLog, now]
  );

  const filtering = Boolean(search.trim()) || action !== "all" || actor !== "all";

  const clearFilters = () => {
    setSearch("");
    setAction("all");
    setActor("all");
  };

  const wipe = async () => {
    const ok = await confirm({
      title: "Delete the entire activity log?",
      tone: "danger",
      confirmLabel: "Delete the log",
      requireText: "DELETE THE AUDIT LOG",
      description:
        "This is the club's only record of what administrators have done. Deleting it cannot be undone, and the deletion itself is not recorded.",
      consequences: [
        `All ${countLabel(activityLog.length, "entry", "entries")} are permanently deleted`,
        "Points, members, tasks and news are not affected",
        "New actions from this point on start a fresh log",
      ],
    });

    if (!ok) return;

    setWiping(true);
    const success = await onWipe();
    setWiping(false);

    if (success) toast.success("The activity log was deleted");
  };

  return (
    <div className="space-y-5">
      <Panel
        icon="shield-check"
        eyebrow="Accountability"
        title="Admin activity"
        description="Who did what, to whom, and exactly when."
        actions={
          <>
            <Badge tone="neutral" icon="history">
              {countLabel(activityLog.length, "entry", "entries")}
            </Badge>
            {todayCount > 0 && (
              <Badge tone="brand" dot>
                {formatNumber(todayCount)} today
              </Badge>
            )}
            {isHeadAdmin && (
              <Button
                variant="danger"
                size="sm"
                icon="trash"
                loading={wiping}
                onClick={wipe}
              >
                Wipe log
              </Button>
            )}
          </>
        }
        bodyClassName="space-y-3"
      >
        <div className="grid gap-3 lg:grid-cols-[2fr_1fr_1fr]">
          <SearchInput
            value={search}
            onChange={setSearch}
            label="Search the log"
            placeholder="Name, action or details…"
            resultCount={search.trim() ? filtered.length : undefined}
          />

          <Select
            label="Action"
            value={action}
            options={actionOptions}
            onChange={(event) => setAction(event.target.value)}
          />

          <Select
            label="Administrator"
            value={actor}
            options={actorOptions}
            onChange={(event) => setActor(event.target.value)}
          />
        </div>

        {filtering && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
            <p className="text-[0.8125rem] text-ink-muted">
              {filtered.length === 0
                ? "No entries match these filters."
                : `${countLabel(filtered.length, "entry", "entries")} of ${formatNumber(activityLog.length)}.`}
            </p>
            <Button size="xs" variant="ghost" icon="close" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        )}
      </Panel>

      {activityLog.length === 0 ? (
        <EmptyState
          icon="shield"
          title="Nothing recorded yet"
          description="Administrative actions — role changes, point awards, deactivations — are written here as they happen."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="search"
          title="No matching activity"
          description="Try a different search term, or clear the filters to see the whole log."
          action={
            <Button variant="secondary" icon="close" onClick={clearFilters}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className="space-y-5">
          {days.map((day) => (
            <section key={day.label}>
              <h3 className="nx-eyebrow sticky top-[var(--topbar-h)] z-10 -mx-1 mb-3 bg-canvas/90 px-1 py-1.5 backdrop-blur">
                {day.label}
                <span className="ml-2 font-normal text-ink-subtle normal-case">
                  {countLabel(day.items.length, "entry", "entries")}
                </span>
              </h3>

              <ul className="space-y-3">
                {day.items.map((item) => (
                  <Entry
                    key={item.id}
                    item={item}
                    actor={byId.get(item.admin_id)}
                    target={byId.get(item.target_user_id)}
                    now={now}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminActivity;
