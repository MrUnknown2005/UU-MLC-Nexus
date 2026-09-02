import { supabase } from "../lib/supabaseClient";

export async function fetchDashboardData({
  profileId,
  canViewMembers,
  canViewHistory,
}) {
  const memberQuery = canViewMembers
    ? supabase.from("profiles").select("*").order("points", { ascending: false })
    : supabase
        .from("profiles")
        .select("*")
        .neq("role", "guest")
        .eq("is_active", true)
        .order("points", { ascending: false });

  const [
    memberResult,
    myHistoryResult,
    fullHistoryResult,
    monthResult,
    newsResult,
    activityResult,
  ] = await Promise.all([
    memberQuery,
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
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("monthly_leaderboard")
      .select("*")
      .order("month_start", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("news")
      .select("*")
      .order("created_at", { ascending: false }),
    canViewHistory
      ? supabase
          .from("admin_activity_log")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(500)
      : Promise.resolve({ data: [], error: null }),
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
  fetchDashboardData,
  subscribeToProfileChanges,
  subscribeToActivityChanges,
  subscribeToPointHistoryChanges,
  subscribeToNewsChanges,
};
