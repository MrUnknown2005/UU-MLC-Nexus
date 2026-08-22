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
  const { error: deleteError } = await supabase
    .from("role_permissions")
    .delete()
    .eq("role_key", roleKey);

  if (deleteError) {
    return { error: deleteError };
  }

  if (!permissionKeys.length) {
    return { error: null };
  }

  return supabase.from("role_permissions").insert(
    permissionKeys.map((permissionKey) => ({
      role_key: roleKey,
      permission_key: permissionKey,
    })),
  );
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
