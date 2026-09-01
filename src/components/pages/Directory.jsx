import { useMemo, useState } from "react";
import { Avatar } from "../ui/Avatar.jsx";
import { Badge } from "../ui/Badge.jsx";
import { Button } from "../ui/Button.jsx";
import { ChipBar } from "../ui/ChipBar.jsx";
import { EmptyState } from "../ui/EmptyState.jsx";
import { Icon } from "../ui/Icon.jsx";
import { Panel } from "../ui/Panel.jsx";
import { SearchInput } from "../ui/SearchInput.jsx";
import { SegmentedControl } from "../ui/SegmentedControl.jsx";
import { roleLabel, roleTone } from "../../lib/roles.js";
import { cn } from "../../lib/cn.js";
import {
  countLabel,
  displayName,
  formatNumber,
  ordinal,
} from "../../lib/format.js";

/**
 * The public face of the club.
 *
 * Two changes of substance from the old version. The role filter is built from
 * the roles the members actually hold rather than a hard-coded list of five, so
 * a role an administrator invented shows up here without a code change. And the
 * rank each member holds is shown on their card — the directory and the
 * leaderboard were previously two unrelated views of the same ordering.
 */
const SORTS = [
  { value: "rank", label: "Rank", icon: "trophy" },
  { value: "name", label: "Name", icon: "arrow-down" },
];

function MemberCard({ member, rank, isMe }) {
  const name = displayName(member);

  return (
    <li
      className={cn(
        "nx-card nx-lift flex flex-col p-5 text-center",
        isMe && "nx-selected"
      )}
    >
      <div className="flex justify-center">
        <Avatar size="xl" ring src={member.avatar_url} name={name} seed={member.id} />
      </div>

      <h3 className="mt-3.5 truncate text-base font-semibold">{name}</h3>

      <div className="mt-2 flex flex-wrap justify-center gap-1.5">
        <Badge tone={roleTone(member.role)} size="sm">
          {roleLabel(member.role)}
        </Badge>
        {isMe && (
          <Badge tone="brand" size="sm">
            You
          </Badge>
        )}
      </div>

      <div className="mt-4 flex items-center justify-center gap-5">
        <div>
          <p className="nx-num text-2xl leading-none font-semibold tabular-nums">
            {formatNumber(member.points ?? 0)}
          </p>
          <p className="nx-eyebrow mt-1">Points</p>
        </div>

        <span className="h-8 w-px bg-line" aria-hidden="true" />

        <div>
          <p className="nx-num text-2xl leading-none font-semibold tabular-nums">
            {rank > 0 ? ordinal(rank) : "—"}
          </p>
          <p className="nx-eyebrow mt-1">Rank</p>
        </div>
      </div>

      <p
        className={cn(
          "mt-4 flex-1 text-[0.8125rem] leading-relaxed",
          member.bio?.trim() ? "text-ink-muted" : "text-ink-subtle italic"
        )}
      >
        {member.bio?.trim() || "No bio yet."}
      </p>
    </li>
  );
}

function Directory({ members = [], currentUserId }) {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [sort, setSort] = useState("rank");

  // Guests and deactivated accounts stay private — this is the one screen every
  // member can see, so it only ever lists people who are actually in the club.
  const publicMembers = useMemo(
    () =>
      members.filter(
        (member) => member.role !== "guest" && member.is_active !== false
      ),
    [members]
  );

  // Rank is fixed by total points across the whole club, so it is computed once
  // here and never re-derived from the filtered list — otherwise searching for
  // one person would show them as first.
  const rankById = useMemo(() => {
    const sorted = [...publicMembers].sort(
      (a, b) => Number(b.points ?? 0) - Number(a.points ?? 0)
    );
    return new Map(sorted.map((member, index) => [member.id, index + 1]));
  }, [publicMembers]);

  const roleOptions = useMemo(() => {
    const counts = new Map();
    for (const member of publicMembers) {
      counts.set(member.role, (counts.get(member.role) ?? 0) + 1);
    }

    return [...counts.entries()]
      .map(([key, count]) => ({ key, count, label: roleLabel(key) }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [publicMembers]);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();

    const filtered = publicMembers.filter((member) => {
      if (role !== "all" && member.role !== role) return false;
      if (!needle) return true;

      // Bio is searchable too: "who here does computer vision" is a question
      // this directory should be able to answer.
      return [member.full_name, member.nickname, member.bio]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(needle));
    });

    return filtered.sort((a, b) =>
      sort === "name"
        ? displayName(a).localeCompare(displayName(b))
        : Number(b.points ?? 0) - Number(a.points ?? 0)
    );
  }, [publicMembers, role, search, sort]);

  const filtering = search.trim() !== "" || role !== "all";

  const clear = () => {
    setSearch("");
    setRole("all");
  };

  return (
    <div className="space-y-5">
      <Panel pad="md" bodyClassName="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <SearchInput
              value={search}
              onChange={setSearch}
              onClear={() => setSearch("")}
              placeholder="Search by name or bio…"
              resultCount={filtering ? visible.length : undefined}
            />
          </div>

          <SegmentedControl
            name="directory-sort"
            label="Sort by"
            size="sm"
            value={sort}
            onChange={setSort}
            options={SORTS}
          />
        </div>

        {/* Role chips carry their own counts, which makes the shape of the club
            visible before you click anything. */}
        <ChipBar label="Filter by role">
          <button
            type="button"
            className="nx-chip"
            data-active={role === "all"}
            aria-pressed={role === "all"}
            onClick={() => setRole("all")}
          >
            <Icon name="users" size={14} />
            Everyone
            <span className="nx-num tabular-nums opacity-70">
              {publicMembers.length}
            </span>
          </button>

          {roleOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              className="nx-chip"
              data-active={role === option.key}
              aria-pressed={role === option.key}
              onClick={() => setRole(option.key)}
            >
              {option.label}
              <span className="nx-num tabular-nums opacity-70">
                {option.count}
              </span>
            </button>
          ))}
        </ChipBar>
      </Panel>

      {visible.length === 0 ? (
        <Panel pad="lg">
          <EmptyState
            icon={filtering ? "search" : "users"}
            title={filtering ? "No members match" : "The directory is empty"}
            description={
              filtering
                ? "Try a shorter search, or clear the filters to see everyone."
                : "Once accounts are approved they will be listed here."
            }
            action={
              filtering ? (
                <Button variant="secondary" icon="close" onClick={clear}>
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        </Panel>
      ) : (
        <>
          <p className="text-[0.8125rem] text-ink-muted">
            {countLabel(visible.length, "member")}
            {filtering && ` of ${publicMembers.length}`}
          </p>

          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {visible.map((member) => (
              <MemberCard
                key={member.id}
                member={member}
                rank={rankById.get(member.id) ?? 0}
                isMe={member.id === currentUserId}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default Directory;
