import { useEffect, useRef, useState } from "react";
import {
  fetchDashboardData,
  fetchMembers,
  fetchPointHistory,
  fetchNews,
  fetchActivityLog,
  subscribeToActivityChanges,
  subscribeToProfileChanges,
  subscribeToPointHistoryChanges,
  subscribeToNewsChanges,
} from "../services/dashboardService";
import { useToast } from "../components/ui/toast-context.js";

// Realtime events arrive in bursts — one admin action can write three tables,
// and a bulk RPC emits a storm of row events. Coalesce them so each burst
// triggers at most one refetch per affected group instead of a full reload per
// event.
const REFETCH_DEBOUNCE_MS = 250;

/**
 * Loads dashboard state through the dashboard service. The hook owns React
 * state and lifecycle; the service owns Supabase queries and subscriptions.
 *
 * Refetching is scoped: a realtime event refetches only the query group for
 * the table that changed (debounced), while the initial mount and the manual
 * `loadData` (awaited by member actions, command palette) reload everything.
 */
export function useDashboardData({
  profile,
  canViewMembers,
  canViewHistory,
  isAdmin,
}) {
  const [members, setMembers] = useState([]);
  const [news, setNews] = useState([]);
  const [pointHistory, setPointHistory] = useState([]);
  const [allPointHistory, setAllPointHistory] = useState([]);
  const [previousMonth, setPreviousMonth] = useState(null);
  const [activityLog, setActivityLog] = useState([]);
  const [loading, setLoading] = useState(true);

  const { toast } = useToast();

  // Latest permission flags, read inside debounced/realtime callbacks without
  // making them a dependency (which would reset pending timers on every
  // change). The ref is seeded with the first render's values and kept current
  // in an effect — mutating a ref during render is disallowed, and the
  // callbacks only ever read it asynchronously, after the effect has run.
  const flags = useRef({ canViewMembers, canViewHistory });
  useEffect(() => {
    flags.current = { canViewMembers, canViewHistory };
  }, [canViewMembers, canViewHistory]);

  // Surface a load failure once per burst rather than one toast per query.
  const errorToast = useRef(false);
  const reportError = (label, error) => {
    console.error(`${label}:`, error);
    if (!errorToast.current) {
      errorToast.current = true;
      toast.error("Couldn't refresh the dashboard", {
        description:
          "Some data may be out of date. Check your connection and try again.",
      });
      // Allow another toast after the current burst settles.
      setTimeout(() => {
        errorToast.current = false;
      }, REFETCH_DEBOUNCE_MS * 4);
    }
  };

  // --- Per-group appliers: fetch one group and fold it into state ------------
  const applyMembers = async () => {
    const result = await fetchMembers({ canViewMembers: flags.current.canViewMembers });
    if (result.error) return reportError("Members error", result.error);
    setMembers(result.data || []);
  };

  const applyPointHistory = async () => {
    const { myHistoryResult, fullHistoryResult } = await fetchPointHistory({
      profileId: profile.id,
      canViewHistory: flags.current.canViewHistory,
    });
    if (myHistoryResult.error) {
      reportError("Personal history error", myHistoryResult.error);
      setPointHistory([]);
    } else {
      setPointHistory(myHistoryResult.data || []);
    }
    if (fullHistoryResult.error) {
      reportError("Full point history error", fullHistoryResult.error);
      setAllPointHistory([]);
    } else {
      setAllPointHistory(fullHistoryResult.data || []);
    }
  };

  const applyNews = async () => {
    const result = await fetchNews();
    if (result.error) {
      reportError("News error", result.error);
      setNews([]);
    } else {
      setNews(result.data || []);
    }
  };

  const applyActivityLog = async () => {
    const result = await fetchActivityLog({
      canViewHistory: flags.current.canViewHistory,
    });
    if (result.error) {
      reportError("Activity log error", result.error);
      setActivityLog([]);
    } else {
      setActivityLog(result.data || []);
    }
  };

  // --- Full reload (initial mount + manual callers) --------------------------
  const loadData = async () => {
    const {
      memberResult,
      myHistoryResult,
      fullHistoryResult,
      monthResult,
      newsResult,
      activityResult,
    } = await fetchDashboardData({
      profileId: profile.id,
      canViewMembers: flags.current.canViewMembers,
      canViewHistory: flags.current.canViewHistory,
    });

    if (memberResult.error) reportError("Members error", memberResult.error);
    setMembers(memberResult.data || []);

    if (myHistoryResult.error) {
      reportError("Personal history error", myHistoryResult.error);
      setPointHistory([]);
    } else {
      setPointHistory(myHistoryResult.data || []);
    }

    if (fullHistoryResult.error) {
      reportError("Full point history error", fullHistoryResult.error);
      setAllPointHistory([]);
    } else {
      setAllPointHistory(fullHistoryResult.data || []);
    }

    if (monthResult.error) {
      reportError("Monthly leaderboard error", monthResult.error);
      setPreviousMonth(null);
    } else {
      setPreviousMonth(monthResult.data || null);
    }

    if (newsResult.error) {
      reportError("News error", newsResult.error);
      setNews([]);
    } else {
      setNews(newsResult.data || []);
    }

    if (activityResult.error) {
      reportError("Activity log error", activityResult.error);
      setActivityLog([]);
    } else {
      setActivityLog(activityResult.data || []);
    }
  };

  // --- Debounced, scoped refetch dispatcher ----------------------------------
  // Realtime callbacks mark which groups changed; a single trailing timer then
  // refetches each marked group once, no matter how many events arrived.
  const pending = useRef(new Set());
  const timer = useRef(null);

  const scheduleRefetch = (group) => {
    pending.current.add(group);
    if (timer.current) return;
    timer.current = setTimeout(() => {
      timer.current = null;
      const groups = pending.current;
      pending.current = new Set();
      if (groups.has("members")) applyMembers();
      if (groups.has("pointHistory")) applyPointHistory();
      if (groups.has("news")) applyNews();
      if (groups.has("activityLog")) applyActivityLog();
    }, REFETCH_DEBOUNCE_MS);
  };

  useEffect(() => {
    let active = true;
    // Reset to the loading state before each full load (initial mount and every
    // role change). `loading` starts true, so the first mount is a no-op here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    loadData().finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
    // Intentional: re-run the full load when the active role changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.role]);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  useEffect(() => {
    // A profiles change can move the leaderboard (points) too, so refresh both.
    const onProfiles = () => {
      scheduleRefetch("members");
      scheduleRefetch("pointHistory");
    };
    const unsubscribe = subscribeToProfileChanges(profile.id, onProfiles);

    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id, profile.role]);

  useEffect(() => {
    // point_history and news are visible to every member, so these run for
    // everyone — not gated on isAdmin like the activity-log subscription below.
    const unsubscribePoints = subscribeToPointHistoryChanges(profile.id, () =>
      scheduleRefetch("pointHistory"),
    );
    const unsubscribeNews = subscribeToNewsChanges(profile.id, () =>
      scheduleRefetch("news"),
    );

    return () => {
      unsubscribePoints();
      unsubscribeNews();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id, profile.role]);

  useEffect(() => {
    if (!isAdmin) {
      return undefined;
    }

    const unsubscribe = subscribeToActivityChanges(profile.id, () =>
      scheduleRefetch("activityLog"),
    );

    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id, profile.role, isAdmin]);

  return {
    members,
    news,
    pointHistory,
    allPointHistory,
    previousMonth,
    activityLog,
    loading,
    loadData,
  };
}

export default useDashboardData;
