import { useMemo } from "react";
import { Avatar } from "../ui/Avatar.jsx";
import { EmptyState } from "../ui/EmptyState.jsx";
import { Icon } from "../ui/Icon.jsx";
import { useNow } from "../../hooks/useNow.js";
import { cn } from "../../lib/cn.js";
import {
  displayName,
  formatDateTime,
  formatDelta,
  formatRelative,
} from "../../lib/format.js";

/**
 * Point ledger rows.
 *
 * Two views over the same data: your own history, and — for anyone allowed to
 * see it — the whole club's. Both use one row component so an award never looks
 * like two different events depending on which screen you opened.
 *
 * The delta leads, because that is the number a member is looking for. It is
 * tabular-figure aligned so a column of awards scans as a column.
 */
function Delta({ points }) {
  const value = Number(points ?? 0);
  const positive = value >= 0;

  return (
    <span
      className={cn(
        "nx-num inline-flex shrink-0 items-center gap-1 rounded-[8px] border px-2 py-1",
        "text-[0.8125rem] font-semibold tabular-nums",
        positive
          ? "border-success-line bg-success-soft text-success"
          : "border-danger-line bg-danger-soft text-danger"
      )}
    >
      <Icon name={positive ? "arrow-up" : "arrow-down"} size={13} />
      {formatDelta(value)}
    </span>
  );
}

function PointRow({ item, member, now }) {
  return (
    <li className="nx-row flex items-start gap-3 px-4 py-3 sm:px-5">
      <Delta points={item.points} />

      <div className="min-w-0 flex-1">
        {member && (
          <p className="flex items-center gap-2 text-[0.8125rem] font-semibold">
            <Avatar
              size="xs"
              src={member.avatar_url}
              name={displayName(member)}
              seed={member.id}
            />
            <span className="truncate">{displayName(member)}</span>
          </p>
        )}

        <p
          className={cn(
            "text-[0.8125rem] text-ink-muted",
            member ? "mt-1" : "leading-snug"
          )}
        >
          {item.reason?.trim() || "No reason recorded"}
        </p>
      </div>

      {/* Relative up front because "2 days ago" is what a member reads for;
          the exact stamp stays available on hover for anyone auditing. */}
      <time
        className="shrink-0 pt-0.5 text-right text-[0.6875rem] whitespace-nowrap text-ink-subtle"
        dateTime={item.created_at ?? undefined}
        title={formatDateTime(item.created_at)}
      >
        {formatRelative(item.created_at, now)}
      </time>
    </li>
  );
}

export function PersonalPointHistory({ history = [] }) {
  const now = useNow();

  if (history.length === 0) {
    return (
      <EmptyState
        compact
        icon="trophy"
        title="No points yet"
        description="Awards from club activities and events will show up here as soon as an executive records one."
      />
    );
  }

  return (
    <ul className="-mx-4 sm:-mx-5">
      {history.map((item) => (
        <PointRow key={item.id} item={item} now={now} />
      ))}
    </ul>
  );
}

export function AdminPointHistory({ history = [], rankedMembers = [] }) {
  const now = useNow();

  // A map, not a `.find()` per row: the club-wide ledger can run to hundreds of
  // entries and this turns the render from quadratic into linear.
  const byId = useMemo(
    () => new Map(rankedMembers.map((member) => [member.id, member])),
    [rankedMembers]
  );

  if (history.length === 0) {
    return (
      <EmptyState
        compact
        icon="history"
        title="Nothing recorded yet"
        description="Every point awarded or deducted by any executive will be listed here."
      />
    );
  }

  return (
    <ul className="-mx-4 sm:-mx-5">
      {history.map((item) => (
        <PointRow
          key={item.id}
          item={item}
          now={now}
          member={byId.get(item.member_id) ?? { id: item.member_id }}
        />
      ))}
    </ul>
  );
}
