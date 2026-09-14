import { useEffect, useState } from "react";
import {
  fetchIncompleteTodosForBadge,
  subscribeToTodoChanges,
} from "../services/todoService";

/**
 * Tracks incomplete todos (just enough fields for the sidebar badge) and
 * derives how many are overdue. Data access and realtime subscription live
 * in todoService; this hook owns React state and lifecycle only.
 */
export function useTodoBadges(profile) {
  const [todosForBadge, setTodosForBadge] = useState([]);

  useEffect(() => {
    // The loader doubles as the realtime callback; `active` gates its setState so
    // a late fetch (or a StrictMode remount) can't touch an unmounted hook. (LOW #6)
    let active = true;
    const loadTodoBadges = async () => {
      const { data, error } = await fetchIncompleteTodosForBadge();
      if (active && !error) setTodosForBadge(data || []);
    };

    loadTodoBadges();
    const unsubscribe = subscribeToTodoChanges(loadTodoBadges);
    return () => {
      active = false;
      unsubscribe();
    };
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
