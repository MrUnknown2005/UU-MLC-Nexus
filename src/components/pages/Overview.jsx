import { useMemo } from "react";
import { Avatar } from "../ui/Avatar.jsx";
import { Badge } from "../ui/Badge.jsx";
import { EmptyState } from "../ui/EmptyState.jsx";
import { Icon } from "../ui/Icon.jsx";
import { Panel } from "../ui/Panel.jsx";
import { StatCard } from "../ui/StatCard.jsx";
import SafeImage from "../common/SafeImage";
import { PersonalPointHistory } from "../common/PointHistory";
import { useNow } from "../../hooks/useNow.js";
import { roleLabel, roleTone } from "../../lib/roles.js";
import { cn } from "../../lib/cn.js";
import {
  countLabel,
  displayName,
  formatDelta,
  formatMonth,
  formatNumber,
  formatRelative,
  ordinal,
  truncate,
} from "../../lib/format.js";

/**
 * The landing screen inside the app.
 *
 * Ordered by what a member actually opens the app to find out: where do I
 * stand, what changed, what is coming up. The old version led with a decorative
 * hero and four glowing tiles that repeated the same number twice.
 */
function greeting(hour) {
  if (hour < 5) return "Still up";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const RANK_STYLES = [
  { icon: "crown", chip: "bg-brand-soft text-brand-text", bar: "bg-brand" },
  { icon: "medal", chip: "bg-violet-soft text-violet", bar: "bg-violet" },
  { icon: "medal", chip: "bg-info-soft text-info", bar: "bg-info" },
];

function LeaderRow({ member, index, isMe, leaderPoints }) {
  const style = RANK_STYLES[index];
  const points = Number(member.points ?? 0);
  const share = leaderPoints > 0 ? Math.max(4, (points / leaderPoints) * 100) : 0;

  return (
    <li
      className={cn(
        "relative flex items-center gap-3 px-4 py-3 sm:px-5",
        "border-b border-line last:border-b-0",
        isMe && "bg-brand-soft/40"
      )}
    >
      {/* Rank marker: a medal for the podium, a plain figure below it. Three
          tiers is enough hierarchy — colouring every row removes the signal. */}
      <span
        className={cn(
          "grid h-8 w-8 shrink-0 place-items-center rounded-[9px] text-xs font-semibold tabular-nums",
          style ? style.chip : "bg-surface-3 text-ink-subtle"
        )}
        aria-hidden="true"
      >
        {style ? <Icon name={style.icon} size={15} /> : index + 1}
      </span>

      <Avatar
        size="sm"
        src={member.avatar_url}
        name={displayName(member)}
        seed={member.id}
        ring={isMe}
      />

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-[0.8125rem] font-semibold">
          <span className="truncate">{displayName(member)}</span>
          {isMe && (
            <Badge tone="brand" size="sm">
              You
            </Badge>
          )}
        </p>

        {/* A bar rather than a second number: relative standing is the thing a
            leaderboard is for, and it reads without arithmetic. */}
        <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-surface-3">
          <span
            className={cn("block h-full rounded-full", style ? style.bar : "bg-line-strong")}
            style={{ width: `${share}%` }}
          />
        </span>
      </div>

      <span className="nx-num shrink-0 text-sm font-semibold tabular-nums">
        {formatNumber(points)}
      </span>
      <span className="sr-only">points, ranked {ordinal(index + 1)}</span>
    </li>
  );
}

function NewsCard({ item, now }) {
  return (
    <article className="nx-card nx-lift overflow-hidden">
      {item.image_url && (
        <SafeImage
          src={item.image_url}
          alt={item.title || "News image"}
          ratio="16 / 7"
          className="h-32 border-b border-line"
        />
      )}

      <div className="p-4">
        <h4 className="text-[0.875rem] leading-snug font-semibold">
          {item.title || "Untitled"}
        </h4>

        <p className="mt-1.5 text-[0.8125rem] leading-relaxed whitespace-pre-wrap text-ink-muted">
          {truncate(item.content ?? "", 180)}
        </p>

        {item.created_at && (
          <p className="mt-3 flex items-center gap-1.5 text-[0.6875rem] text-ink-subtle">
            <Icon name="clock" size={12} />
            {formatRelative(item.created_at, now)}
          </p>
        )}
      </div>
    </article>
  );
}

function Podium({ place, name, points, tone }) {
  const tones = {
    brand: "border-brand-line bg-brand-soft/60 text-brand-text",
    violet: "border-violet-line bg-violet-soft/60 text-violet",
  };

  return (
    <div className="nx-well flex items-center gap-4 p-4">
      <span
        className={cn(
          "grid h-12 w-12 shrink-0 place-items-center rounded-card border",
          tones[tone]
        )}
      >
        <Icon name={place === 1 ? "trophy" : "medal"} size={22} />
      </span>

      <div className="min-w-0">
        <p className="nx-eyebrow">{place === 1 ? "Top performer" : "Runner up"}</p>
        <p className="mt-0.5 truncate text-[0.9375rem] font-semibold">
          {name?.trim() || "Not recorded"}
        </p>
        <p className="nx-num text-[0.8125rem] text-ink-muted tabular-nums">
          {countLabel(points ?? 0, "point")}
        </p>
      </div>
    </div>
  );
}

function Overview({
  profile,
  rankedMembers = [],
  news = [],
  currentRank,
  pointHistory = [],
  previousMonth,
}) {
  const now = useNow();

  const topFive = rankedMembers.slice(0, 5);
  const latestNews = news.slice(0, 3);
  const leaderPoints = Number(rankedMembers[0]?.points ?? 0);

  const activeCount = useMemo(
    () =>
      rankedMembers.filter(
        (member) => member.is_active !== false && member.role !== "guest"
      ).length,
    [rankedMembers]
  );

  // Everything a member earned this calendar month, so the headline number has
  // a trend beside it rather than sitting there without context.
  const earnedThisMonth = useMemo(() => {
    const start = new Date(now);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    return pointHistory.reduce((total, item) => {
      const stamp = item.created_at ? new Date(item.created_at) : null;
      if (!stamp || stamp < start) return total;
      return total + Number(item.points ?? 0);
    }, 0);
  }, [pointHistory, now]);

  const hour = new Date(now).getHours();

  return (
    <div className="space-y-5">
      {/* ---------- Greeting ---------- */}
      <Panel pad="lg" className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar
              size="xl"
              ring
              src={profile.avatar_url}
              name={displayName(profile)}
              seed={profile.id}
            />

            <div className="min-w-0">
              <p className="nx-eyebrow">{greeting(hour)}</p>
              <h2 className="nx-display mt-1 truncate text-2xl sm:text-3xl">
                {displayName(profile)}
              </h2>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge tone={roleTone(profile.role)} icon="shield-check">
                  {roleLabel(profile.role)}
                </Badge>
                {currentRank > 0 && (
                  <Badge tone="neutral" icon="trending-up">
                    {ordinal(currentRank)} of {rankedMembers.length}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* The club's pulse in one line — it makes the header carry
              information rather than just a name and a photograph. */}
          <dl className="flex gap-6">
            <div>
              <dt className="nx-eyebrow">Members</dt>
              <dd className="nx-num mt-1 text-2xl font-semibold tabular-nums">
                {formatNumber(activeCount)}
              </dd>
            </div>
            <div>
              <dt className="nx-eyebrow">Updates</dt>
              <dd className="nx-num mt-1 text-2xl font-semibold tabular-nums">
                {formatNumber(news.length)}
              </dd>
            </div>
          </dl>
        </div>
      </Panel>

      {/* ---------- Stats ---------- */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Your points"
          value={formatNumber(profile.points ?? 0)}
          icon="trophy"
          tone="brand"
          delta={
            earnedThisMonth !== 0
              ? {
                  direction: earnedThisMonth > 0 ? "up" : "down",
                  label: formatDelta(earnedThisMonth),
                }
              : undefined
          }
          hint="This month"
        />
        <StatCard
          label="Your rank"
          value={currentRank > 0 ? ordinal(currentRank) : "—"}
          icon="trending-up"
          tone="violet"
          hint={
            currentRank > 0
              ? `Out of ${countLabel(rankedMembers.length, "member")}`
              : "Earn points to be ranked"
          }
        />
        <StatCard
          label="Awards received"
          value={formatNumber(pointHistory.length)}
          icon="sparkles"
          tone="info"
          hint="All time"
        />
        <StatCard
          label="Club members"
          value={formatNumber(activeCount)}
          icon="users"
          tone="success"
          hint="Active accounts"
        />
      </div>

      {/* ---------- Leaderboard + news ---------- */}
      <div className="grid items-start gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel
          pad="none"
          icon="trophy"
          eyebrow="Standings"
          title="Top five"
          description="Ranked by total points across the club."
        >
          {topFive.length === 0 ? (
            <div className="p-4 sm:p-5">
              <EmptyState
                compact
                icon="users"
                title="No members ranked yet"
                description="As soon as points are awarded, the leaderboard fills in."
              />
            </div>
          ) : (
            <ol>
              {topFive.map((member, index) => (
                <LeaderRow
                  key={member.id}
                  member={member}
                  index={index}
                  isMe={member.id === profile.id}
                  leaderPoints={leaderPoints}
                />
              ))}
            </ol>
          )}
        </Panel>

        <Panel
          icon="newspaper"
          eyebrow="Club updates"
          title="Latest news"
          description={
            news.length > 3
              ? `Showing 3 of ${formatNumber(news.length)}.`
              : undefined
          }
          bodyClassName="space-y-3"
        >
          {latestNews.length === 0 ? (
            <EmptyState
              compact
              icon="newspaper"
              title="Nothing published yet"
              description="Announcements, event notices and results will appear here."
            />
          ) : (
            latestNews.map((item) => (
              <NewsCard key={item.id} item={item} now={now} />
            ))
          )}
        </Panel>
      </div>

      {/* ---------- Previous month ---------- */}
      <Panel
        icon="medal"
        eyebrow={
          previousMonth?.month_start
            ? formatMonth(previousMonth.month_start)
            : "Previous month"
        }
        title="Monthly standouts"
        description="Archived when the leaderboard was last reset."
      >
        {!previousMonth ? (
          <EmptyState
            compact
            icon="calendar"
            title="No completed month yet"
            description="Once a monthly leaderboard is archived, its top two finishers are kept here."
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            <Podium
              place={1}
              tone="brand"
              name={previousMonth.first_place_name}
              points={previousMonth.first_place_points}
            />
            <Podium
              place={2}
              tone="violet"
              name={previousMonth.second_place_name}
              points={previousMonth.second_place_points}
            />
          </div>
        )}
      </Panel>

      {/* ---------- Personal ledger ---------- */}
      <Panel
        icon="history"
        eyebrow="Your activity"
        title="Point history"
        description={
          pointHistory.length > 0
            ? countLabel(pointHistory.length, "record")
            : undefined
        }
        actions={
          pointHistory.length > 6 ? (
            <Badge tone="neutral">Showing the 6 most recent</Badge>
          ) : undefined
        }
        pad="md"
      >
        <PersonalPointHistory history={pointHistory.slice(0, 6)} />
      </Panel>
    </div>
  );
}

export default Overview;
