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
      <section className="nexus-glass-strong rounded-3xl p-6 relative overflow-hidden">
        <div className="nexus-glow-purple w-72 h-72 -top-20 -right-20" />
        <div className="nexus-glow-cyan w-72 h-72 -bottom-20 -left-20" />

        <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-5">
          <div>
            <p className="nexus-text-aurora text-xs font-bold uppercase tracking-wider">
              Security
            </p>
            <h2 className="text-3xl font-black mt-1">
              Roles &{" "}
              <span className="nexus-text-ocean">Permissions</span>
            </h2>
            <p className="text-gray-500 mt-2">
              Create custom roles and decide exactly what each role can access.
            </p>
          </div>

          <button
            type="button"
            onClick={resetEditor}
            className="nexus-morphic-button px-5 py-3"
          >
            + New Custom Role
          </button>
        </div>
      </section>

      <section className="grid lg:grid-cols-[0.7fr_1.3fr] gap-5">
        <div className="nexus-glass-strong rounded-3xl p-5 relative overflow-hidden">
          <div className="absolute -top-10 -left-10 w-48 h-48 rounded-full bg-yellow-400/10 blur-3xl pointer-events-none" />

          <div className="relative">
            <p className="nexus-text-aurora text-xs font-bold uppercase tracking-wider">
              Library
            </p>
            <h3 className="text-xl font-black mt-1">Available Roles</h3>
          </div>
          <div className="space-y-2 mt-4">
            {roles.map((role) => (
              <button
                key={role.role_key}
                type="button"
                onClick={() => setSelectedRoleKey(role.role_key)}
                className={`w-full text-left p-4 rounded-2xl border transition backdrop-blur-md ${
                  selectedRoleKey === role.role_key
                    ? "bg-gradient-to-r from-yellow-400/15 to-purple-500/10 border-yellow-400/40 shadow-[0_0_24px_rgba(250,204,21,0.18)]"
                    : "nexus-glass-flat hover:border-yellow-400/30 hover:bg-white/[0.06]"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-bold">{role.name}</span>
                  {role.is_system && (
                    <span className="text-[10px] px-2 py-1 rounded-lg nexus-badge uppercase font-bold">
                      System
                    </span>
                  )}
                </div>
                <p className="text-gray-500 text-xs mt-1">
                  {role.description || role.role_key}
                </p>
              </button>
            ))}
          </div>
        </div>

        <form
          onSubmit={saveRole}
          className="nexus-glass-strong rounded-3xl p-6 space-y-5 relative overflow-hidden"
        >
          <div className="absolute -bottom-10 -right-10 w-56 h-56 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

          <div className="relative">
            <p className="nexus-text-aurora text-xs font-bold uppercase tracking-wider">
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

          <div className="relative grid md:grid-cols-2 gap-4">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={selectedRole?.is_system}
              placeholder="Role name — e.g. Senior Executive"
              className="nexus-input disabled:opacity-50"
            />
            <input
              value={roleKey}
              onChange={(event) => setRoleKey(event.target.value)}
              disabled={Boolean(selectedRole)}
              placeholder="Role key — e.g. senior_executive"
              className="nexus-input disabled:opacity-50"
            />
          </div>

          <div className="relative">
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={selectedRole?.is_system}
              rows={3}
              placeholder="Describe this role..."
              className="nexus-textarea disabled:opacity-50"
            />
          </div>

          <div className="relative">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <p className="font-bold">Permissions</p>
                <p className="text-gray-500 text-xs mt-1">
                  <span className="text-yellow-300 font-bold">{selectedPermissionKeys.length}</span> selected
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {Object.entries(groupedPermissions).map(([category, items]) => (
                <div key={category}>
                  <p className="text-gray-500 text-xs uppercase tracking-wider mb-2 font-bold">
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
                          className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition backdrop-blur-md ${
                            checked
                              ? "bg-gradient-to-br from-yellow-400/10 to-purple-500/10 border-yellow-400/40 shadow-[0_0_18px_rgba(250,204,21,0.16)]"
                              : "nexus-glass-flat hover:border-yellow-400/30"
                          } ${selectedRole?.is_system ? "cursor-default" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={selectedRole?.is_system}
                            onChange={() => togglePermission(permissionKey)}
                            className="mt-1 accent-yellow-400"
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-bold">
                              {permission.name}
                            </span>
                            <span className="block text-gray-500 text-[11px] mt-1">
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
            <div className="relative nexus-badge-yellow rounded-xl px-3 py-2 whitespace-pre-wrap">
              {message}
            </div>
          )}

          <div className="relative flex flex-wrap gap-3">
            {!selectedRole?.is_system && (
              <button
                type="submit"
                disabled={saving}
                className="nexus-morphic-button px-6 py-3 disabled:opacity-50"
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
                className="nexus-morphic-button-danger px-6 py-3 disabled:opacity-50"
              >
                Delete Role
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="nexus-glass-strong rounded-3xl p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/[0.04] via-purple-500/[0.04] to-cyan-400/[0.04] pointer-events-none" />

        <p className="relative text-gray-400 text-sm">
          <span className="text-yellow-300 font-bold">Heads up:</span> Built-in roles stay protected. Custom roles can be created, edited, assigned to members, and given only the permissions they need.
        </p>
      </section>
    </div>
  );
}

export default RoleManager;
