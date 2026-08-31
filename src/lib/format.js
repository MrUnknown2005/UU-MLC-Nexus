/* =============================================================
   Formatting helpers
   -------------------------------------------------------------
   Every date, number and name in the product is rendered through
   this module so a member's row in the directory and the same
   member's row in an audit log never disagree.
   ============================================================= */

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parse a value coming out of Postgres into a Date.
 *
 * Date-only columns (`deadline`, `month_start`) are parsed as LOCAL midnight,
 * not UTC. `new Date("2026-08-30")` is UTC midnight, which renders as the 29th
 * for anyone west of Greenwich — the bug that makes a task look overdue a day
 * early.
 */
export function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  if (typeof value === "string" && DATE_ONLY.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** "30 Aug 2026" */
export function formatDate(value) {
  const date = parseDate(value);
  if (!date) return "—";
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** "30 Aug 2026, 14:05" */
export function formatDateTime(value) {
  const date = parseDate(value);
  if (!date) return "—";
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "August 2026" — used for the monthly leaderboard header. */
export function formatMonth(value) {
  const date = parseDate(value);
  if (!date) return "—";
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

/** "2026-08-30" — the shape a `<input type="date">` expects. */
export function toDateInputValue(value) {
  const date = parseDate(value);
  if (!date) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const RELATIVE_STEPS = [
  { limit: 60, unit: "second", div: 1 },
  { limit: 3600, unit: "minute", div: 60 },
  { limit: 86400, unit: "hour", div: 3600 },
  { limit: 604800, unit: "day", div: 86400 },
  { limit: 2629800, unit: "week", div: 604800 },
  { limit: 31557600, unit: "month", div: 2629800 },
  { limit: Infinity, unit: "year", div: 31557600 },
];

/**
 * "3 hours ago", "in 2 days". `now` is injectable so callers can pass a
 * snapshot and keep a whole list of timestamps consistent within one render.
 */
export function formatRelative(value, now = Date.now()) {
  const date = parseDate(value);
  if (!date) return "—";

  const seconds = (date.getTime() - now) / 1000;
  const magnitude = Math.abs(seconds);

  if (magnitude < 45) return "just now";

  const step = RELATIVE_STEPS.find((s) => magnitude < s.limit);
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  return formatter.format(Math.round(seconds / step.div), step.unit);
}

/** Days from today to a deadline. Negative means overdue. */
export function daysUntil(value, now = Date.now()) {
  const date = parseDate(value);
  if (!date) return null;

  const startOfTarget = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  ).getTime();
  const today = new Date(now);
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  ).getTime();

  return Math.round((startOfTarget - startOfToday) / 86400000);
}

/** Human deadline copy: "Overdue by 2 days", "Due today", "Due in 5 days". */
export function formatDeadline(value, now = Date.now()) {
  const days = daysUntil(value, now);
  if (days === null) return "No deadline";
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days === -1) return "Overdue by 1 day";
  if (days < 0) return `Overdue by ${Math.abs(days)} days`;
  return `Due in ${days} days`;
}

/** 1240 → "1,240". Signed variant used for point deltas. */
export function formatNumber(value) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n.toLocaleString() : "0";
}

export function formatDelta(value) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "0";
  return `${n > 0 ? "+" : ""}${n.toLocaleString()}`;
}

/** 1 → "1st", 2 → "2nd", 13 → "13th". */
export function ordinal(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  const mod100 = Math.abs(n) % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  const suffix = ["th", "st", "nd", "rd"][Math.abs(n) % 10] ?? "th";
  return `${n}${suffix}`;
}

export function pluralize(count, singular, plural = `${singular}s`) {
  return Number(count) === 1 ? singular : plural;
}

/** "3 members", "1 member" */
export function countLabel(count, singular, plural) {
  return `${formatNumber(count)} ${pluralize(count, singular, plural)}`;
}

/** Two-letter monogram for avatar fallbacks. */
export function initials(...names) {
  const source = names.find((n) => typeof n === "string" && n.trim()) ?? "";
  const words = source.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/** Best available display name for a profile row. */
export function displayName(profile) {
  if (!profile) return "Unknown member";
  return (
    profile.nickname?.trim() ||
    profile.full_name?.trim() ||
    profile.email?.split("@")[0] ||
    "Unknown member"
  );
}

/** Trim a long string for a single-line slot without cutting mid-word. */
export function truncate(text, max = 80) {
  const value = String(text ?? "");
  if (value.length <= max) return value;
  const cut = value.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/** Turn `SOME_ACTION_NAME` into `Some action name` for audit log rows. */
export function humanizeToken(token) {
  const value = String(token ?? "").trim();
  if (!value) return "—";
  const words = value.toLowerCase().replace(/[_-]+/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Deterministic accent for a member, so the same person keeps a colour. */
const ACCENTS = ["brand", "violet", "info", "success", "warn", "danger"];

export function accentFor(seed) {
  const value = String(seed ?? "");
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) % 100000;
  }
  return ACCENTS[hash % ACCENTS.length];
}
