import { useEffect, useState } from "react";
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
      canViewMembers,
      canViewHistory,
    });

    if (memberResult.error) {
      console.error("Members error:", memberResult.error);
    }
    setMembers(memberResult.data || []);

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
    loadData,
  };
}

export default useDashboardData;
