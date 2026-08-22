import { supabase } from "../lib/supabaseClient";

export async function fetchIncompleteTodosForBadge() {
  return supabase
    .from("todos")
    .select("id, completed, deadline")
    .eq("completed", false);
}

export function subscribeToTodoChanges(onChange) {
  const channel = supabase
    .channel("todo-badges")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "todos" },
      onChange,
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

export default {
  fetchIncompleteTodosForBadge,
  subscribeToTodoChanges,
};
