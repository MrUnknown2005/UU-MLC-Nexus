import { supabase } from "../lib/supabaseClient";

// Full point history is a display-only feed (a count + the AdminPointHistory
// list on the Points page); no total or leaderboard is summed from it, so a
// cap cannot corrupt any figure. Bounded so it can't grow without limit and
// get re-pulled in full on every reload.
const FULL_HISTORY_LIMIT = 500;
const ACTIVITY_LOG_LIMIT = 500;

// --- Granular fetchers -------------------------------------------------------
// One per realtime table group, so a realtime event can refetch just the data
// it touched instead of reloading the whole dashboard. `fetchDashboardData`
// composes them for the initial load and manual full refreshes.

export async function fetchMembers({ canViewMembers }) {
  const query = canViewMembers
    ? supabase.from("profiles").select("*").order("points", { ascending: false })
    : supabase
        .from("profiles")
        .select("*")
        .neq("role", "guest")
        .eq("is_active", true)
        .order("points", { ascending: false });

  return query;
}

export async function fetchPointHistory({ profileId, canViewHistory }) {
  const [myHistoryResult, fullHistoryResult] = await Promise.all([
    supabase
      .from("point_history")
      .select("*")
      .eq("member_id", profileId)
      .order("created_at", { ascending: false }),
    canViewHistory
      ? supabase
          .from("point_history")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(FULL_HISTORY_LIMIT)
      : Promise.resolve({ data: [], error: null }),
  ]);

  return { myHistoryResult, fullHistoryResult };
}

export async function fetchPreviousMonth() {
  return supabase
    .from("monthly_leaderboard")
    .select("*")
    .order("month_start", { ascending: false })
    .limit(1)
    .maybeSingle();
}

export async function fetchNews() {
  return supabase.from("news").select("*").order("created_at", { ascending: false });
}

export async function fetchActivityLog({ canViewHistory }) {
  return canViewHistory
    ? supabase
        .from("admin_activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(ACTIVITY_LOG_LIMIT)
    : Promise.resolve({ data: [], error: null });
}

export async function fetchDashboardData({
  profileId,
  canViewMembers,
  canViewHistory,
}) {
  const [
    memberResult,
    { myHistoryResult, fullHistoryResult },
    monthResult,
    newsResult,
    activityResult,
  ] = await Promise.all([
    fetchMembers({ canViewMembers }),
    fetchPointHistory({ profileId, canViewHistory }),
    fetchPreviousMonth(),
    fetchNews(),
    fetchActivityLog({ canViewHistory }),
  ]);

  return {
    memberResult,
    myHistoryResult,
    fullHistoryResult,
    monthResult,
    newsResult,
    activityResult,
  };
}

export function subscribeToProfileChanges(profileId, onChange) {
  const channel = supabase
    .channel(`profiles-${profileId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "profiles",
      },
      onChange,
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

export function subscribeToActivityChanges(profileId, onChange) {
  const channel = supabase
    .channel(`activity-${profileId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "admin_activity_log",
      },
      onChange,
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

export function subscribeToPointHistoryChanges(profileId, onChange) {
  const channel = supabase
    .channel(`point-history-${profileId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "point_history",
      },
      onChange,
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

export function subscribeToNewsChanges(profileId, onChange) {
  const channel = supabase
    .channel(`news-${profileId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "news",
      },
      onChange,
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

export default {
  fetchMembers,
  fetchPointHistory,
  fetchPreviousMonth,
  fetchNews,
  fetchActivityLog,
  fetchDashboardData,
  subscribeToProfileChanges,
  subscribeToActivityChanges,
  subscribeToPointHistoryChanges,
  subscribeToNewsChanges,
};
