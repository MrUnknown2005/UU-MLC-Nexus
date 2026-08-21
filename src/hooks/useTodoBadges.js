import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * Tracks incomplete todos (just enough fields for the sidebar badge) and
 * derives how many are overdue. Stays in sync via a realtime subscription
 * so the badge updates as todos are completed/added elsewhere.
 */
export function useTodoBadges(profile) {
  const [todosForBadge, setTodosForBadge] = useState([]);

  useEffect(() => {
    const loadTodoBadges = async () => {
      const { data, error } = await supabase
        .from("todos")
        .select("id, completed, deadline")
        .eq("completed", false);
      if (!error) setTodosForBadge(data || []);
    };
    loadTodoBadges();
    const channel = supabase
      .channel(`todo-badges-${profile.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "todos" },
        loadTodoBadges,
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [profile.id]);

  const overdueTodoCount = todosForBadge.filter(
    (todo) =>
      todo.deadline &&
      new Date(`${todo.deadline}T00:00:00`) <
        new Date(new Date().setHours(0, 0, 0, 0)),
  ).length;

  return { overdueTodoCount };
}

export default useTodoBadges;
