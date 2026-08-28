import { useEffect, useState } from "react";
import { createRole, countMembersWithRole, deleteCustomRole, loadRolePermissions, loadRolesAndPermissions, replaceRolePermissions, updateRole } from "../../services/roleService";
import { PERMISSION_CATALOG, SYSTEM_ROLE_DEFINITIONS } from "../../constants/roles";

function RoleManager({ currentUser, roleDefinitions, onRolesChanged }) {
  const [roles, setRoles] = useState(roleDefinitions || SYSTEM_ROLE_DEFINITIONS);
  const [permissions, setPermissions] = useState(PERMISSION_CATALOG);
  const [selectedRoleKey, setSelectedRoleKey] = useState("");
  const [selectedPermissionKeys, setSelectedPermissionKeys] = useState([]);
  const [name, setName] = useState("");
  const [roleKey, setRoleKey] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const loadRoles = async () => {
    const [{ data: roleData, error: roleError }, { data: permissionData, error: permissionError }] = await loadRolesAndPermissions();
    if (!roleError && roleData?.length) setRoles(roleData);
    if (!permissionError && permissionData?.length) setPermissions(permissionData);
  };

  // This effect intentionally synchronizes initial remote role data into local UI state.
  // The fetch helper owns the async boundary; the lint exception avoids a false positive on that helper call.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadRoles(); }, []);

  const selectedRole = roles.find((role) => role.role_key === selectedRoleKey);

  useEffect(() => {
    const loadSelected = async () => {
      if (!selectedRoleKey) { setSelectedPermissionKeys([]); setName(""); setRoleKey(""); setDescription(""); return; }
      const role = roles.find((item) => item.role_key === selectedRoleKey);
      if (!role) return;
      setName(role.name || ""); setRoleKey(role.role_key || ""); setDescription(role.description || "");
      const { data, error } = await loadRolePermissions(selectedRoleKey);
      if (!error) setSelectedPermissionKeys((data || []).map((item) => item.permission_key));
    };
    loadSelected();
  }, [selectedRoleKey, roles]);

  const resetEditor = () => { setSelectedRoleKey(""); setSelectedPermissionKeys([]); setName(""); setRoleKey(""); setDescription(""); setMessage(""); };
  const togglePermission = (key) => setSelectedPermissionKeys((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);

  const saveRole = async (event) => {
    event.preventDefault(); setMessage("");
    if (!name.trim() || !roleKey.trim()) { setMessage("Role name and role key are required."); return; }
    const normalizedKey = roleKey.trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_");
    const existingRole = roles.find((role) => role.role_key === selectedRoleKey);
    if (existingRole?.is_system) { setMessage("Built-in roles are protected. Create a custom role instead."); return; }
    setSaving(true);
    try {
      let finalRoleKey = normalizedKey;
      if (selectedRoleKey) {
        const { error } = await updateRole({ roleKey: selectedRoleKey, name: name.trim(), description: description.trim() });
        if (error) throw error; finalRoleKey = selectedRoleKey;
      } else {
        const { error } = await createRole({ roleKey: finalRoleKey, name: name.trim(), description: description.trim(), createdBy: currentUser.id });
        if (error) throw error;
      }
      const { error: permissionError } = await replaceRolePermissions(finalRoleKey, selectedPermissionKeys);
      if (permissionError) throw permissionError;
      setMessage(selectedRoleKey ? "Role updated successfully." : "Role created successfully.");
      await loadRoles(); await onRolesChanged?.(); if (!selectedRoleKey) setSelectedRoleKey(finalRoleKey);
    } catch (error) { setMessage(error.message || "Could not save role."); } finally { setSaving(false); }
  };

  const deleteRole = async () => {
    if (!selectedRole || selectedRole.is_system) { setMessage("Built-in roles cannot be deleted."); return; }
    if (!window.confirm(`Delete the custom role "${selectedRole.name}"?`)) return;
    setSaving(true); setMessage("");
    try {
      const { count, error: countError } = await countMembersWithRole(selectedRole.role_key);
      if (countError) throw countError;
      if ((count || 0) > 0) { setMessage("This role is assigned to members. Reassign them before deleting it."); return; }
      const { error } = await deleteCustomRole(selectedRole.role_key);
      if (error) throw error;
      resetEditor(); await loadRoles(); await onRolesChanged?.(); setMessage("Role deleted successfully.");
    } catch (error) { setMessage(error.message || "Could not delete role."); } finally { setSaving(false); }
  };

  const groupedPermissions = permissions.reduce((groups, permission) => { const category = permission.category || "Other"; if (!groups[category]) groups[category] = []; groups[category].push(permission); return groups; }, {});

  return (
    <div className="space-y-6">
      <section className="nexus-glass-strong rounded-3xl p-6 md:p-7 relative overflow-hidden">
        <div className="nexus-glow-purple w-72 h-72 -top-20 -right-20" /><div className="nexus-glow-cyan w-72 h-72 -bottom-20 -left-20" />
        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
          <div><p className="nexus-eyebrow nexus-text-aurora">Security control</p><h2 className="nexus-title text-3xl md:text-4xl font-black mt-2">Roles & <span className="nexus-text-ocean">Permissions</span></h2><p className="nexus-muted mt-2 max-w-2xl">Define least-privilege access for the club without touching protected system roles.</p></div>
          <button type="button" onClick={resetEditor} className="nexus-morphic-button px-5 py-3 shrink-0">+ New Custom Role</button>
        </div>
      </section>

      <section className="grid lg:grid-cols-[0.68fr_1.32fr] gap-5 items-start">
        <div className="nexus-glass-strong rounded-3xl p-5 relative overflow-hidden">
          <p className="nexus-eyebrow nexus-text-aurora">Role library</p><h3 className="nexus-title text-xl font-black mt-1">Available Roles</h3>
          <div className="space-y-2 mt-4">{roles.map((role) => <button key={role.role_key} type="button" onClick={() => setSelectedRoleKey(role.role_key)} className={`w-full text-left p-4 rounded-2xl border transition ${selectedRoleKey === role.role_key ? "nexus-glass-selected" : "nexus-glass-hover"}`}><div className="flex items-center justify-between gap-3"><span className="font-bold truncate">{role.name}</span>{role.is_system && <span className="nexus-badge shrink-0 text-[10px] uppercase font-bold">System</span>}</div><p className="nexus-muted text-xs mt-1 line-clamp-2">{role.description || role.role_key}</p></button>)}</div>
        </div>

        <form onSubmit={saveRole} className="nexus-glass-strong rounded-3xl p-6 space-y-5 relative overflow-hidden">
          <div className="relative flex items-start justify-between gap-4"><div><p className="nexus-eyebrow nexus-text-aurora">{selectedRole ? (selectedRole.is_system ? "Protected system role" : "Edit custom role") : "New custom role"}</p><h3 className="nexus-title text-2xl font-black mt-1">{selectedRole ? selectedRole.name : "Create a role"}</h3></div>{selectedRole && <button type="button" onClick={resetEditor} className="nexus-morphic-button-ghost text-xs px-3 py-2">Clear</button>}</div>
          <div className="relative grid md:grid-cols-2 gap-4"><input value={name} onChange={(e) => setName(e.target.value)} disabled={selectedRole?.is_system} placeholder="Role name" className="nexus-input disabled:opacity-50" /><input value={roleKey} onChange={(e) => setRoleKey(e.target.value)} disabled={Boolean(selectedRole)} placeholder="role_key" className="nexus-input disabled:opacity-50" /></div>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={selectedRole?.is_system} rows={3} placeholder="Describe what this role is responsible for..." className="relative nexus-textarea disabled:opacity-50" />
          <div className="relative"><div className="flex items-end justify-between mb-3"><div><p className="font-bold">Permission matrix</p><p className="nexus-muted text-xs mt-1">Grant only what this role needs.</p></div><span className="nexus-badge-yellow">{selectedPermissionKeys.length} selected</span></div><div className="space-y-4">{Object.entries(groupedPermissions).map(([category, items]) => <div key={category}><p className="nexus-eyebrow mb-2">{category}</p><div className="grid sm:grid-cols-2 gap-2">{items.map((permission) => { const permissionKey = permission.permission_key || permission.key; const checked = selectedPermissionKeys.includes(permissionKey); return <label key={permissionKey} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${checked ? "nexus-glass-selected" : "nexus-glass-hover"} ${selectedRole?.is_system ? "cursor-default" : ""}`}><input type="checkbox" checked={checked} disabled={selectedRole?.is_system} onChange={() => togglePermission(permissionKey)} className="mt-1 accent-yellow-400" /><span className="min-w-0"><span className="block text-sm font-bold">{permission.name}</span><span className="block nexus-muted text-[11px] mt-1 leading-relaxed">{permission.description}</span></span></label>; })}</div></div>)}</div></div>
          {message && <div className="relative rounded-xl border border-yellow-400/20 bg-yellow-400/5 px-3 py-2 text-sm text-yellow-200">{message}</div>}
          <div className="relative flex flex-wrap gap-3">{!selectedRole?.is_system && <button type="submit" disabled={saving} className="nexus-morphic-button px-6 py-3 disabled:opacity-50">{saving ? "Saving..." : selectedRole ? "Save Changes" : "Create Role"}</button>}{selectedRole && !selectedRole.is_system && <button type="button" onClick={deleteRole} disabled={saving} className="nexus-morphic-button-danger px-6 py-3 disabled:opacity-50">Delete Role</button>}</div>
        </form>
      </section>

      <section className="nexus-glass-flat rounded-2xl p-4 border border-yellow-400/10"><p className="nexus-muted text-sm"><span className="text-yellow-300 font-bold">Security note:</span> Built-in roles remain protected. Custom roles use explicit permissions and cannot be deleted while members are assigned to them.</p></section>
    </div>
  );
}

export default RoleManager;
