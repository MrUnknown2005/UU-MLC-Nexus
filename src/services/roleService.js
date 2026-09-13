import { supabase } from "../lib/supabaseClient";

export async function loadRolesAndPermissions() {
  return Promise.all([
    supabase
      .from("role_definitions")
      .select("role_key, name, description, is_system")
      .order("name", { ascending: true }),
    supabase
      .from("permissions")
      .select("permission_key, name, description, category")
      .order("category", { ascending: true })
      .order("name", { ascending: true }),
  ]);
}

export async function loadRolePermissions(roleKey) {
  return supabase
    .from("role_permissions")
    .select("permission_key")
    .eq("role_key", roleKey);
}

export async function createRole({ roleKey, name, description, createdBy }) {
  return supabase.from("role_definitions").insert({
    role_key: roleKey,
    name,
    description,
    is_system: false,
    created_by: createdBy,
  });
}

export async function updateRole({ roleKey, name, description }) {
  return supabase
    .from("role_definitions")
    .update({ name, description })
    .eq("role_key", roleKey);
}

export async function replaceRolePermissions(roleKey, permissionKeys) {
  // Apply a minimal delta, adding before removing, so a mid-operation failure
  // leaves the role with a SUPERSET of its permissions — never zero. A bare
  // delete-then-insert could strand a role with no permissions if the insert
  // failed after the delete committed (there is no client-side transaction),
  // locking members — or admins — out of features. True atomicity would need a
  // transactional RPC; add-then-remove makes the non-atomic path fail safe.
  const { data: existingRows, error: loadError } = await supabase
    .from("role_permissions")
    .select("permission_key")
    .eq("role_key", roleKey);

  if (loadError) {
    return { error: loadError };
  }

  const current = new Set((existingRows ?? []).map((row) => row.permission_key));
  const desired = new Set(permissionKeys);
  const toAdd = [...desired].filter((key) => !current.has(key));
  const toRemove = [...current].filter((key) => !desired.has(key));

  // Add first: if this fails, nothing has been removed and the role is unchanged.
  if (toAdd.length) {
    const { error: insertError } = await supabase.from("role_permissions").insert(
      toAdd.map((permissionKey) => ({
        role_key: roleKey,
        permission_key: permissionKey,
      })),
    );

    if (insertError) {
      return { error: insertError };
    }
  }

  // Remove second: if this fails, the role keeps a superset (old ∪ new), still
  // never zero, and the caller surfaces the error so the admin can retry.
  if (toRemove.length) {
    const { error: deleteError } = await supabase
      .from("role_permissions")
      .delete()
      .eq("role_key", roleKey)
      .in("permission_key", toRemove);

    if (deleteError) {
      return { error: deleteError };
    }
  }

  return { error: null };
}

export async function countMembersWithRole(roleKey) {
  return supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", roleKey);
}

export async function deleteCustomRole(roleKey) {
  return supabase
    .from("role_definitions")
    .delete()
    .eq("role_key", roleKey)
    .eq("is_system", false);
}

export default {
  loadRolesAndPermissions,
  loadRolePermissions,
  createRole,
  updateRole,
  replaceRolePermissions,
  countMembersWithRole,
  deleteCustomRole,
};
