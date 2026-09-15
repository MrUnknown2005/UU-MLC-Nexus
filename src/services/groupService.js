import { supabase } from "../lib/supabaseClient";

/**
 * Data layer for the Groups feature.
 *
 * Everything here is a thin wrapper over the Supabase singleton — no derived
 * state, no counters. Standings are computed in Groups.jsx from these raw rows
 * plus the `members` list the dashboard already holds, so there is nothing
 * stored that can drift out of sync.
 *
 * Membership rows carry only ids; Groups.jsx resolves names/avatars from its
 * `members` prop (the same list Directory and Members render), so we never
 * depend on a profiles join behaving a particular way.
 */

export async function fetchGroups() {
  return supabase
    .from("groups")
    .select("id, name, description, color, created_by, created_at")
    .order("created_at", { ascending: true });
}

export async function fetchGroupMembers() {
  return supabase.from("group_members").select("group_id, member_id");
}

/**
 * Completed tasks only — the rows that award task-points. `completed_by` says
 * whose tally (and, through membership, whose groups) the points land in.
 */
export async function fetchCompletedTodos() {
  return supabase
    .from("todos")
    .select("id, points, completed, completed_by")
    .eq("completed", true);
}

export async function createGroup({ name, description, color, created_by }) {
  return supabase.from("groups").insert({
    name,
    description: description ?? "",
    color: color ?? null,
    created_by: created_by ?? null,
  });
}

export async function updateGroup(id, patch) {
  return supabase.from("groups").update(patch).eq("id", id);
}

export async function deleteGroup(id) {
  return supabase.from("groups").delete().eq("id", id);
}

/**
 * Reconcile a group's membership to `nextMemberIds`, given the ids it currently
 * holds. Only the difference is written: added ids are inserted, removed ids are
 * deleted, and an unchanged set touches the database not at all. Returns the
 * first error encountered (or `{ error: null }`), matching the shape callers
 * already check on the other wrappers.
 */
export async function saveGroupMembers(
  groupId,
  nextMemberIds,
  currentMemberIds,
  addedBy,
) {
  const next = new Set(nextMemberIds);
  const current = new Set(currentMemberIds);

  const toAdd = [...next].filter((id) => !current.has(id));
  const toRemove = [...current].filter((id) => !next.has(id));

  if (toRemove.length > 0) {
    const { error } = await supabase
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .in("member_id", toRemove);
    if (error) return { error };
  }

  if (toAdd.length > 0) {
    const { error } = await supabase.from("group_members").insert(
      toAdd.map((memberId) => ({
        group_id: groupId,
        member_id: memberId,
        added_by: addedBy ?? null,
      })),
    );
    if (error) return { error };
  }

  return { error: null };
}

/**
 * One channel covering everything a standings view depends on: the groups
 * themselves, their membership, and the completed-task rows that feed points.
 * Returns an unsubscribe, same as todoService.
 */
export function subscribeToGroupChanges(onChange) {
  const channel = supabase
    .channel("groups-feed")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "groups" },
      onChange,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "group_members" },
      onChange,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "todos" },
      onChange,
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

export default {
  fetchGroups,
  fetchGroupMembers,
  fetchCompletedTodos,
  createGroup,
  updateGroup,
  deleteGroup,
  saveGroupMembers,
  subscribeToGroupChanges,
};
