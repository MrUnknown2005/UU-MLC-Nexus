import { supabase } from "../lib/supabaseClient";

/**
 * Data-access boundary for RBAC reads. UI hooks should consume this service
 * instead of calling Supabase directly for permission/role data.
 */
export async function loadRoleAccess() {
  return Promise.all([
    supabase.rpc("get_my_permissions"),
    supabase
      .from("role_definitions")
      .select("role_key, name, description, is_system")
      .order("name", { ascending: true }),
  ]);
}

export default { loadRoleAccess };
