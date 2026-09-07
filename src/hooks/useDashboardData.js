import { useEffect, useRef, useState } from "react";
import {
  fetchDashboardData,
  subscribeToActivityChanges,
  subscribeToProfileChanges,
  subscribeToPointHistoryChanges,
  subscribeToNewsChanges,
} from "../services/dashboardService";

/**
 * Loads dashboard state through the dashboard service. The hook owns React
 * state and lifecycle; the service owns Supabase queries and subscriptions.
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
  const [dataError, setDataError] = useState(false);

  // Guards against a slow earlier load resolving after a newer one and
  // overwriting fresh data with stale — a single mutation fans out into several
  // concurrent loadData() calls (the mutation itself plus realtime echoes).
  const loadSeq = useRef(0);

  const loadData = async () => {
    const seq = loadSeq.current + 1;
    loadSeq.current = seq;

    try {
      const {
        memberResult,
        myHistoryResult,
        fullHistoryResult,
        monthResult,
        newsResult,
        activityResult,
      } = await fetchDashboardData({
        profileId: profile.id,
        canViewMembers,
        canViewHistory,
      });

      // A newer load started while this one was in flight — let it win rather
      // than overwriting fresh data with stale.
      if (loadSeq.current !== seq) return;

      // The members list is the shared backbone (leaderboard, directory,
      // member management). A failed read must not blank it into a confident
      // "empty club" — surface the error and keep whatever was already there.
      if (memberResult.error) {
        console.error("Members error:", memberResult.error);
      } else {
        setMembers(memberResult.data || []);
      }

      if (myHistoryResult.error) {
        console.error("Personal history error:", myHistoryResult.error);
        setPointHistory([]);
      } else {
        setPointHistory(myHistoryResult.data || []);
      }

      if (fullHistoryResult.error) {
        console.error("Full point history error:", fullHistoryResult.error);
        setAllPointHistory([]);
      } else {
        setAllPointHistory(fullHistoryResult.data || []);
      }

      if (monthResult.error) {
        console.error("Monthly leaderboard error:", monthResult.error);
        setPreviousMonth(null);
      } else {
        setPreviousMonth(monthResult.data || null);
      }

      if (newsResult.error) {
        console.error("News error:", newsResult.error);
        setNews([]);
      } else {
        setNews(newsResult.data || []);
      }

      if (activityResult.error) {
        console.error("Activity log error:", activityResult.error);
        setActivityLog([]);
      } else {
        setActivityLog(activityResult.data || []);
      }

      // Keyed on the members read: that is the one whose failure produces the
      // false "empty club". Secondary sections fall back to empty on their own.
      setDataError(Boolean(memberResult.error));
    } catch (err) {
      // fetchDashboardData resolves query errors into each result's `.error`,
      // so reaching here means something threw outright (network drop, an
      // unexpected rejection). Surface it rather than stranding the skeleton.
      if (loadSeq.current !== seq) return;
      console.error("Dashboard data load failed:", err);
      setDataError(true);
    } finally {
      // Only the newest load clears the first-load skeleton; a superseded load
      // must not flip it off on the current one's behalf.
      if (loadSeq.current === seq) setLoading(false);
    }
  };

  useEffect(() => {
    // Intentional fetch, re-run when the active role changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.role]);

  useEffect(() => {
    const unsubscribe = subscribeToProfileChanges(profile.id, loadData);

    return unsubscribe;
    // loadData is intentionally omitted: it's redefined each render,
    // and including it would tear down/recreate the realtime subscription unnecessarily.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id, profile.role]);

  useEffect(() => {
    // point_history and news are visible to every member, so these run for
    // everyone — not gated on isAdmin like the activity-log subscription below.
    const unsubscribePoints = subscribeToPointHistoryChanges(
      profile.id,
      loadData,
    );
    const unsubscribeNews = subscribeToNewsChanges(profile.id, loadData);

    return () => {
      unsubscribePoints();
      unsubscribeNews();
    };
    // loadData is intentionally omitted: it's redefined each render,
    // and including it would tear down/recreate the realtime subscriptions unnecessarily.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id, profile.role]);

  useEffect(() => {
    if (!isAdmin) {
      return undefined;
    }

    const unsubscribe = subscribeToActivityChanges(profile.id, loadData);

    return unsubscribe;
    // loadData is intentionally omitted: it's redefined each render,
    // and including it would tear down/recreate the realtime subscription unnecessarily.
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
    dataError,
    loadData,
  };
}

export default useDashboardData;
