import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { PERMISSION_CATALOG, SYSTEM_ROLE_DEFINITIONS } from "../../constants/roles";

function RoleManager({ currentUser, roleDefinitions, onRolesChanged }) {
  const [roles, setRoles] = useState(
    roleDefinitions || SYSTEM_ROLE_DEFINITIONS,
  );
  const [permissions, setPermissions] = useState(PERMISSION_CATALOG);
  const [selectedRoleKey, setSelectedRoleKey] = useState("");
  const [selectedPermissionKeys, setSelectedPermissionKeys] = useState([]);
  const [name, setName] = useState("");
  const [roleKey, setRoleKey] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const loadRoles = async () => {
    const [
      { data: roleData, error: roleError },
      { data: permissionData, error: permissionError },
    ] = await Promise.all([
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

    if (!roleError && roleData?.length) {
      setRoles(roleData);
    }

    if (!permissionError && permissionData?.length) {
      setPermissions(permissionData);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  const selectedRole = roles.find((role) => role.role_key === selectedRoleKey);

  useEffect(() => {
    const loadSelectedRolePermissions = async () => {
      if (!selectedRoleKey) {
        setSelectedPermissionKeys([]);
        setName("");
        setRoleKey("");
        setDescription("");
        return;
      }

      const role = roles.find((item) => item.role_key === selectedRoleKey);
      if (!role) return;

      setName(role.name || "");
      setRoleKey(role.role_key || "");
      setDescription(role.description || "");

      const { data, error } = await supabase
        .from("role_permissions")
        .select("permission_key")
        .eq("role_key", selectedRoleKey);

      if (!error) {
        setSelectedPermissionKeys(
          (data || []).map((item) => item.permission_key),
        );
      }
    };

    loadSelectedRolePermissions();
  }, [selectedRoleKey, roles]);

  const resetEditor = () => {
    setSelectedRoleKey("");
    setSelectedPermissionKeys([]);
    setName("");
    setRoleKey("");
    setDescription("");
    setMessage("");
  };

  const togglePermission = (permissionKey) => {
    setSelectedPermissionKeys((current) =>
      current.includes(permissionKey)
        ? current.filter((key) => key !== permissionKey)
        : [...current, permissionKey],
    );
  };

  const saveRole = async (event) => {
    event.preventDefault();
    setMessage("");

    if (!name.trim() || !roleKey.trim()) {
      setMessage("Role name and role key are required.");
      return;
    }

    const normalizedKey = roleKey
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "_");
    const existingRole = roles.find(
      (role) => role.role_key === selectedRoleKey,
    );

    if (existingRole?.is_system) {
      setMessage("Built-in roles are protected. Create a custom role instead.");
      return;
    }

    setSaving(true);

    try {
      let finalRoleKey = normalizedKey;

      if (selectedRoleKey) {
        const { error: roleError } = await supabase
          .from("role_definitions")
          .update({
            name: name.trim(),
            description: description.trim(),
          })
          .eq("role_key", selectedRoleKey);

        if (roleError) throw roleError;
        finalRoleKey = selectedRoleKey;
      } else {
        const { error: roleError } = await supabase
          .from("role_definitions")
          .insert({
            role_key: finalRoleKey,
            name: name.trim(),
            description: description.trim(),
            is_system: false,
            created_by: currentUser.id,
          });

        if (roleError) throw roleError;
      }

      const { error: deleteError } = await supabase
        .from("role_permissions")
        .delete()
        .eq("role_key", finalRoleKey);

      if (deleteError) throw deleteError;

      if (selectedPermissionKeys.length > 0) {
        const rows = selectedPermissionKeys.map((permissionKey) => ({
          role_key: finalRoleKey,
          permission_key: permissionKey,
        }));

        const { error: permissionError } = await supabase
          .from("role_permissions")
          .insert(rows);

        if (permissionError) throw permissionError;
      }

      setMessage(
        selectedRoleKey
          ? "Role updated successfully."
          : "Role created successfully.",
      );
      await loadRoles();
      await onRolesChanged?.();

      if (!selectedRoleKey) {
        setSelectedRoleKey(finalRoleKey);
      }
    } catch (error) {
      setMessage(error.message || "Could not save role.");
    } finally {
      setSaving(false);
    }
  };

  const deleteRole = async () => {
    if (!selectedRole || selectedRole.is_system) {
      setMessage("Built-in roles cannot be deleted.");
      return;
    }

    if (!window.confirm(`Delete the custom role "${selectedRole.name}"?`)) {
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const { count, error: countError } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", selectedRole.role_key);

      if (countError) throw countError;

      if ((count || 0) > 0) {
        setMessage(
          "This role is assigned to members. Reassign them before deleting it.",
        );
        return;
      }

      const { error } = await supabase
        .from("role_definitions")
        .delete()
        .eq("role_key", selectedRole.role_key)
        .eq("is_system", false);

      if (error) throw error;

      resetEditor();
      await loadRoles();
      await onRolesChanged?.();
      setMessage("Role deleted successfully.");
    } catch (error) {
      setMessage(error.message || "Could not delete role.");
    } finally {
      setSaving(false);
    }
  };

  const groupedPermissions = permissions.reduce((groups, permission) => {
    const category = permission.category || "Other";
    if (!groups[category]) groups[category] = [];
    groups[category].push(permission);
    return groups;
  }, {});

  return (
    <div className="space-y-6">
      <section className="bg-white/[0.04] border border-white/10 rounded-3xl p-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
          <div>
            <p className="text-yellow-400 text-sm font-semibold">Security</p>
            <h2 className="text-3xl font-black mt-1">Roles & Permissions</h2>
            <p className="text-gray-500 mt-2">
              Create custom roles and decide exactly what each role can access.
            </p>
          </div>

          <button
            type="button"
            onClick={resetEditor}
            className="px-5 py-3 rounded-xl bg-yellow-400 text-black font-bold hover:bg-yellow-300"
          >
            + New Custom Role
          </button>
        </div>
      </section>

      <section className="grid lg:grid-cols-[0.7fr_1.3fr] gap-5">
        <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-5">
          <h3 className="text-xl font-bold">Available Roles</h3>
          <div className="space-y-2 mt-4">
            {roles.map((role) => (
              <button
                key={role.role_key}
                type="button"
                onClick={() => setSelectedRoleKey(role.role_key)}
                className={`w-full text-left p-4 rounded-2xl border transition ${
                  selectedRoleKey === role.role_key
                    ? "bg-yellow-400/10 border-yellow-400/30"
                    : "bg-white/[0.025] border-white/5 hover:bg-white/5"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold">{role.name}</span>
                  {role.is_system && (
                    <span className="text-[10px] px-2 py-1 rounded-lg bg-white/5 text-gray-500 border border-white/10">
                      SYSTEM
                    </span>
                  )}
                </div>
                <p className="text-gray-600 text-xs mt-1">
                  {role.description || role.role_key}
                </p>
              </button>
            ))}
          </div>
        </div>

        <form
          onSubmit={saveRole}
          className="bg-white/[0.04] border border-white/10 rounded-3xl p-6 space-y-5"
        >
          <div>
            <p className="text-yellow-400 text-sm font-semibold">
              {selectedRole
                ? selectedRole.is_system
                  ? "System Role"
                  : "Edit Custom Role"
                : "New Custom Role"}
            </p>
            <h3 className="text-2xl font-black mt-1">
              {selectedRole ? selectedRole.name : "Create a role"}
            </h3>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={selectedRole?.is_system}
              placeholder="Role name — e.g. Senior Executive"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none disabled:opacity-50"
            />
            <input
              value={roleKey}
              onChange={(event) => setRoleKey(event.target.value)}
              disabled={Boolean(selectedRole)}
              placeholder="Role key — e.g. senior_executive"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none disabled:opacity-50"
            />
          </div>

          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={selectedRole?.is_system}
            rows={3}
            placeholder="Describe this role..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 resize-none outline-none disabled:opacity-50"
          />

          <div>
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <p className="font-semibold">Permissions</p>
                <p className="text-gray-600 text-xs mt-1">
                  {selectedPermissionKeys.length} selected
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {Object.entries(groupedPermissions).map(([category, items]) => (
                <div key={category}>
                  <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">
                    {category}
                  </p>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {items.map((permission) => {
                      const checked = selectedPermissionKeys.includes(
                        permission.permission_key || permission.key,
                      );
                      const permissionKey =
                        permission.permission_key || permission.key;
                      return (
                        <label
                          key={permissionKey}
                          className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                            checked
                              ? "bg-yellow-400/[0.07] border-yellow-400/20"
                              : "bg-white/[0.025] border-white/5"
                          } ${selectedRole?.is_system ? "cursor-default" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={selectedRole?.is_system}
                            onChange={() => togglePermission(permissionKey)}
                            className="mt-1"
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold">
                              {permission.name}
                            </span>
                            <span className="block text-gray-600 text-[11px] mt-1">
                              {permission.description}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {message && (
            <p className="text-yellow-400 text-sm whitespace-pre-wrap">
              {message}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            {!selectedRole?.is_system && (
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 rounded-xl bg-yellow-400 text-black font-bold disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : selectedRole
                    ? "Save Changes"
                    : "Create Role"}
              </button>
            )}

            {selectedRole && !selectedRole.is_system && (
              <button
                type="button"
                onClick={deleteRole}
                disabled={saving}
                className="px-6 py-3 rounded-xl bg-red-500/10 text-red-300 border border-red-400/20 disabled:opacity-50"
              >
                Delete Role
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="bg-white/[0.04] border border-white/10 rounded-3xl p-6">
        <p className="text-gray-500 text-sm">
          Built-in roles stay protected. Custom roles can be created, edited,
          assigned to members, and given only the permissions they need.
        </p>
      </section>
    </div>
  );
}

export default RoleManager;
