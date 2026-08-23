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
    const loadTodoBadges = async () => {
      const { data, error } = await fetchIncompleteTodosForBadge();
      if (!error) setTodosForBadge(data || []);
    };

    loadTodoBadges();
    const unsubscribe = subscribeToTodoChanges(loadTodoBadges);
    return unsubscribe;
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
