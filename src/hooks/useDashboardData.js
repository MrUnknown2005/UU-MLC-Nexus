import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * Loads the bulk of the dashboard's data: members, personal + full point
 * history, previous month's leaderboard, news, and (for admins) the
 * activity log. Re-fetches whenever the signed-in member's role changes,
 * and stays in sync via realtime subscriptions on profiles and
 * admin_activity_log.
 */
export function useDashboardData({ profile, canViewMembers, canViewHistory, isAdmin }) {
  const [members, setMembers] = useState([]);
  const [news, setNews] = useState([]);
  const [pointHistory, setPointHistory] = useState([]);
  const [allPointHistory, setAllPointHistory] = useState([]);
  const [previousMonth, setPreviousMonth] = useState(null);
  const [activityLog, setActivityLog] = useState([]);

  const loadData = async () => {
    let memberData = [];

    if (canViewMembers) {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("points", {
          ascending: false,
        });

      if (!error) {
        memberData = data || [];
      } else {
        console.error("Members error:", error);
      }
    } else {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .neq("role", "guest")
        .eq("is_active", true)
        .order("points", {
          ascending: false,
        });

      if (!error) {
        memberData = data || [];
      }
    }

    setMembers(memberData);

    /*
      Personal history.
    */
    const { data: myHistory, error: myHistoryError } = await supabase
      .from("point_history")
      .select("*")
      .eq("member_id", profile.id)
      .order("created_at", {
        ascending: false,
      });

    if (myHistoryError) {
      console.error("Personal history error:", myHistoryError);

      setPointHistory([]);
    } else {
      setPointHistory(myHistory || []);
    }

    /*
      Full history for Admins.
    */
    if (canViewHistory) {
      const { data: fullHistory, error: fullHistoryError } = await supabase
        .from("point_history")
        .select("*")
        .order("created_at", {
          ascending: false,
        });

      if (fullHistoryError) {
        console.error("Full point history error:", fullHistoryError);

        setAllPointHistory([]);
      } else {
        setAllPointHistory(fullHistory || []);
      }
    } else {
      setAllPointHistory([]);
    }

    /*
      Previous month.
    */
    const { data: monthData, error: monthError } = await supabase
      .from("monthly_leaderboard")
      .select("*")
      .order("month_start", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (monthError) {
      console.error("Monthly leaderboard error:", monthError);

      setPreviousMonth(null);
    } else {
      setPreviousMonth(monthData || null);
    }

    /*
      News.
    */
    const { data: newsData, error: newsError } = await supabase
      .from("news")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (newsError) {
      setNews([]);
    } else {
      setNews(newsData || []);
    }

    /*
      Admin Activity.
    */
    if (canViewHistory) {
      const { data: activityData, error: activityError } = await supabase
        .from("admin_activity_log")
        .select("*")
        .order("created_at", {
          ascending: false,
        })
        .limit(500);

      if (activityError) {
        console.error("Activity log error:", activityError);

        setActivityLog([]);
      } else {
        setActivityLog(activityData || []);
      }
    } else {
      setActivityLog([]);
    }
  };

  useEffect(() => {
    // Intentional fetch, re-run when the active role changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.role]);

  /*
  =========================================================
  REAL-TIME PROFILE UPDATES
  =========================================================
  */

  useEffect(() => {
    const channel = supabase
      .channel(`profiles-${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
        },
        () => {
          loadData();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // loadData is intentionally omitted: it's redefined each render,
    // and including it would tear down/recreate the realtime subscription unnecessarily.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id, profile.role]);

  /*
  =========================================================
  REAL-TIME ACTIVITY LOG
  =========================================================
  */

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    const channel = supabase
      .channel(`activity-${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "admin_activity_log",
        },
        () => {
          loadData();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
