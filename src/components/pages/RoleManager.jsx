import { useCallback, useEffect, useMemo, useState } from "react";
import {
  countMembersWithRole,
  createRole,
  deleteCustomRole,
  loadRolePermissions,
  loadRolesAndPermissions,
  replaceRolePermissions,
  updateRole,
} from "../../services/roleService";
import {
  PERMISSION_CATALOG,
  SYSTEM_ROLE_DEFINITIONS,
} from "../../constants/roles";
import { Badge } from "../ui/Badge.jsx";
import { Button } from "../ui/Button.jsx";
import { Checkbox } from "../ui/Checkbox.jsx";
import { Icon } from "../ui/Icon.jsx";
import { Panel } from "../ui/Panel.jsx";
import { Skeleton } from "../ui/Skeleton.jsx";
import { TextArea } from "../ui/TextArea.jsx";
import { TextInput } from "../ui/TextInput.jsx";
import { useConfirm } from "../ui/confirm-context.js";
import { useToast } from "../ui/toast-context.js";
import { cn } from "../../lib/cn.js";
import { countLabel } from "../../lib/format.js";

/**
 * Roles and permissions.
 *
 * Two structural changes from the old screen.
 *
 * The editor is a separate component keyed by the selected role, so choosing a
 * role mounts a fresh form initialised from that role. The old version copied
 * four fields into state inside an effect every time the selection changed —
 * which is what the `set-state-in-effect` suppression at the top of the file was
 * hiding, and it meant a half-typed name could survive into the next role.
 *
 * The permission matrix now says what a role can do in plain language grouped by
 * area, and a protected system role renders as a read-only summary rather than a
 * form with every input disabled — disabled inputs invite you to try.
 */

/** DB rows use `permission_key`; the built-in catalog uses `key`. One shape. */
function normalizePermissions(rows) {
  return rows.map((row) => ({
    key: row.permission_key ?? row.key,
    name: row.name,
    description: row.description,
    category: row.category || "Other",
  }));
}

function groupByCategory(permissions) {
  const groups = new Map();

  for (const permission of permissions) {
    const list = groups.get(permission.category) ?? [];
    list.push(permission);
    groups.set(permission.category, list);
  }

  return [...groups.entries()];
}

function RoleManager({ currentUser, roleDefinitions, onRolesChanged }) {
  const { toast } = useToast();
  const confirm = useConfirm();

  const [roles, setRoles] = useState(
    roleDefinitions?.length ? roleDefinitions : SYSTEM_ROLE_DEFINITIONS
  );
  const [permissions, setPermissions] = useState(() =>
    normalizePermissions(PERMISSION_CATALOG)
  );
  const [selectedRoleKey, setSelectedRoleKey] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [
      { data: roleData, error: roleError },
      { data: permissionData, error: permissionError },
    ] = await loadRolesAndPermissions();

    if (!roleError && roleData?.length) setRoles(roleData);
    if (!permissionError && permissionData?.length) {
      setPermissions(normalizePermissions(permissionData));
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    // Deferred to a microtask so the effect body itself never sets state
    // synchronously — the fetch owns the async boundary, not the effect.
    Promise.resolve().then(refresh);
  }, [refresh]);

  const selectedRole = useMemo(
    () => roles.find((role) => role.role_key === selectedRoleKey) ?? null,
    [roles, selectedRoleKey]
  );

  const grouped = useMemo(() => groupByCategory(permissions), [permissions]);

  const afterSave = useCallback(
    async (roleKey) => {
      await refresh();
      await onRolesChanged?.();
      setSelectedRoleKey(roleKey);
    },
    [refresh, onRolesChanged]
  );

  const remove = useCallback(
    async (role) => {
      const { count, error: countError } = await countMembersWithRole(
        role.role_key
      );

      if (countError) {
        toast.error("Could not check who holds this role", {
          description: countError.message,
        });
        return;
      }

      // Checked before the prompt, so the confirmation can state the real
      // reason rather than failing after the member has already committed.
      if ((count || 0) > 0) {
        toast.warn("This role is still assigned", {
          description: `${countLabel(count, "member")} still ${
            count === 1 ? "holds" : "hold"
          } "${role.name}". Move them to another role first.`,
          duration: 8000,
        });
        return;
      }

      const ok = await confirm({
        title: `Delete the role "${role.name}"?`,
        tone: "danger",
        confirmLabel: "Delete role",
        description:
          "Nobody currently holds this role, so no member loses access. The permission grants attached to it are removed with it.",
      });

      if (!ok) return;

      const { error } = await deleteCustomRole(role.role_key);

      if (error) {
        toast.error("Could not delete the role", { description: error.message });
        return;
      }

      setSelectedRoleKey("");
      await refresh();
      await onRolesChanged?.();
      toast.success(`"${role.name}" was deleted`);
    },
    [confirm, onRolesChanged, refresh, toast]
  );

  return (
    <div className="space-y-5">
      <div className="grid items-start gap-5 lg:grid-cols-[19rem_minmax(0,1fr)]">
        {/* ---------- Role list ---------- */}
        <Panel
          pad="none"
          icon="shield"
          eyebrow="Library"
          title="Roles"
          description={countLabel(roles.length, "role")}
          actions={
            <Button
              size="xs"
              variant={selectedRoleKey ? "secondary" : "primary"}
              icon="plus"
              onClick={() => setSelectedRoleKey("")}
            >
              New
            </Button>
          }
        >
          {loading ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
            </div>
          ) : (
            <ul className="p-2">
              {roles.map((role) => {
                const active = role.role_key === selectedRoleKey;

                return (
                  <li key={role.role_key}>
                    <button
                      type="button"
                      onClick={() => setSelectedRoleKey(role.role_key)}
                      aria-current={active ? "true" : undefined}
                      className={cn(
                        "w-full rounded-card px-3 py-2.5 text-left transition-colors",
                        active ? "nx-selected" : "hover:bg-hover"
                      )}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-[0.875rem] font-semibold">
                          {role.name}
                        </span>
                        {role.is_system ? (
                          <Badge tone="neutral" size="sm" icon="lock">
                            System
                          </Badge>
                        ) : (
                          <Badge tone="brand" size="sm">
                            Custom
                          </Badge>
                        )}
                      </span>

                      <span className="mt-0.5 block truncate text-[0.75rem] text-ink-muted">
                        {role.description || role.role_key}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        {/* ---------- Editor ----------
            Keyed by the selection so each role gets a fresh form. */}
        {selectedRole?.is_system ? (
          <SystemRoleSummary role={selectedRole} grouped={grouped} />
        ) : (
          <RoleEditor
            key={selectedRoleKey || "new"}
            role={selectedRole}
            grouped={grouped}
            createdBy={currentUser.id}
            existingKeys={roles.map((role) => role.role_key)}
            onSaved={afterSave}
            onDelete={remove}
            onCancel={() => setSelectedRoleKey("")}
          />
        )}
      </div>

      <Panel pad="sm" bare className="border border-line bg-surface-2">
        <p className="flex items-start gap-2.5 text-[0.8125rem] text-ink-muted">
          <Icon
            name="lock"
            size={15}
            className="mt-0.5 shrink-0 text-brand-text"
          />
          <span>
            The five built-in roles cannot be renamed, re-scoped or deleted —
            they are what the database's own access rules are written against.
            Custom roles are additive: grant only what the role needs, and a role
            cannot be deleted while anyone still holds it.
          </span>
        </p>
      </Panel>
    </div>
  );
}

/* ============================================================
   Read-only view of a protected role
   ============================================================ */
function SystemRoleSummary({ role, grouped }) {
  const [granted, setGranted] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { data, error } = await loadRolePermissions(role.role_key);
      if (cancelled) return;
      setGranted(error ? [] : (data ?? []).map((row) => row.permission_key));
    };

    Promise.resolve().then(load);

    return () => {
      cancelled = true;
    };
  }, [role.role_key]);

  return (
    <Panel
      icon="lock"
      eyebrow="Protected built-in role"
      title={role.name}
      description={role.description}
      actions={<Badge tone="neutral" icon="lock">Read only</Badge>}
      bodyClassName="space-y-4"
    >
      <p className="text-[0.8125rem] text-ink-muted">
        This role's permissions are enforced by the database itself. To give
        someone a different set of abilities, create a custom role.
      </p>

      {granted === null ? (
        <div className="space-y-2">
          <Skeleton className="h-9" />
          <Skeleton className="h-9" />
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([category, items]) => {
            const active = items.filter((item) => granted.includes(item.key));
            if (active.length === 0) return null;

            return (
              <div key={category}>
                <p className="nx-eyebrow mb-2">{category}</p>
                <ul className="flex flex-wrap gap-1.5">
                  {active.map((item) => (
                    <li key={item.key}>
                      <Badge tone="success" icon="check">
                        {item.name}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          {granted.length === 0 && (
            <p className="text-[0.8125rem] text-ink-subtle italic">
              This role grants no explicit permissions.
            </p>
          )}
        </div>
      )}
    </Panel>
  );
}

/* ============================================================
   Create / edit a custom role
   ============================================================ */
function RoleEditor({
  role,
  grouped,
  createdBy,
  existingKeys,
  onSaved,
  onDelete,
  onCancel,
}) {
  const { toast } = useToast();

  const editing = Boolean(role);

  const [name, setName] = useState(role?.name ?? "");
  const [roleKey, setRoleKey] = useState(role?.role_key ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  // `null` means "still reading the current grants"; a new role starts empty and
  // has nothing to read, so it skips straight to an editable list.
  const [selected, setSelected] = useState(role ? null : []);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!role) return undefined;

    let cancelled = false;

    const load = async () => {
      const { data, error } = await loadRolePermissions(role.role_key);
      if (cancelled) return;
      setSelected(error ? [] : (data ?? []).map((row) => row.permission_key));
    };

    Promise.resolve().then(load);

    return () => {
      cancelled = true;
    };
  }, [role]);

  // Derived on every keystroke rather than normalized on submit, so the member
  // sees the identifier they are actually creating before they create it.
  const normalizedKey = useMemo(
    () =>
      roleKey
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, "_")
        .replace(/^_+|_+$/g, ""),
    [roleKey]
  );

  const keyTaken = !editing && existingKeys.includes(normalizedKey);

  const errors = {
    name: !name.trim() ? "Give the role a name." : "",
    roleKey: !normalizedKey
      ? "An identifier is required."
      : keyTaken
        ? "A role already uses this identifier."
        : "",
  };

  const valid = !errors.name && !errors.roleKey;

  const toggle = (key) =>
    setSelected((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key]
    );

  const setGroup = (items, on) =>
    setSelected((current) => {
      const keys = items.map((item) => item.key);
      const rest = current.filter((key) => !keys.includes(key));
      return on ? [...rest, ...keys] : rest;
    });

  const submit = async (event) => {
    event.preventDefault();
    setTouched(true);

    if (!valid || selected === null) return;

    setSaving(true);

    try {
      const targetKey = editing ? role.role_key : normalizedKey;

      const { error } = editing
        ? await updateRole({
            roleKey: targetKey,
            name: name.trim(),
            description: description.trim(),
          })
        : await createRole({
            roleKey: targetKey,
            name: name.trim(),
            description: description.trim(),
            createdBy,
          });

      if (error) throw error;

      const { error: permissionError } = await replaceRolePermissions(
        targetKey,
        selected
      );

      if (permissionError) throw permissionError;

      toast.success(editing ? `"${name.trim()}" was updated` : `"${name.trim()}" was created`, {
        description: `${countLabel(selected.length, "permission")} granted.`,
      });

      await onSaved(targetKey);
    } catch (error) {
      toast.error("Could not save the role", {
        description: error.message ?? "The server rejected the change.",
      });
    } finally {
      setSaving(false);
    }
  };

  const total = selected?.length ?? 0;

  return (
    <Panel
      as="form"
      onSubmit={submit}
      noValidate
      icon={editing ? "pencil" : "plus"}
      eyebrow={editing ? "Custom role" : "New role"}
      title={editing ? role.name : "Create a custom role"}
      description={
        editing
          ? "Rename it, re-describe it, or change what it can do."
          : "Grant a specific set of abilities without touching the built-in roles."
      }
      actions={
        <>
          <Badge tone={total > 0 ? "brand" : "neutral"}>
            {countLabel(total, "permission")}
          </Badge>
          {editing && (
            <Button size="xs" variant="ghost" icon="close" onClick={onCancel}>
              Close
            </Button>
          )}
        </>
      }
      bodyClassName="space-y-5"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <TextInput
          label="Name"
          required
          placeholder="Events Lead"
          value={name}
          error={touched ? errors.name : ""}
          onChange={(event) => setName(event.target.value)}
        />

        <TextInput
          label="Identifier"
          required
          placeholder="events_lead"
          value={roleKey}
          disabled={editing}
          error={touched ? errors.roleKey : ""}
          hint={
            editing
              ? "Fixed once created — the database references it."
              : normalizedKey && normalizedKey !== roleKey.trim()
                ? `Will be saved as ${normalizedKey}`
                : "Lowercase, letters, digits and underscores."
          }
          onChange={(event) => setRoleKey(event.target.value)}
        />
      </div>

      <TextArea
        label="Description"
        optional
        rows={2}
        maxLength={200}
        placeholder="What is this role responsible for?"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
      />

      <div>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="text-[0.875rem] font-semibold">Permissions</h3>
            <p className="mt-0.5 text-[0.75rem] text-ink-muted">
              Grant the minimum this role needs to do its job.
            </p>
          </div>

          {total > 0 && (
            <Button
              size="xs"
              variant="ghost"
              icon="close"
              onClick={() => setSelected([])}
            >
              Clear all
            </Button>
          )}
        </div>

        {selected === null ? (
          <div className="space-y-2">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map(([category, items]) => {
              const on = items.filter((item) => selected.includes(item.key));
              const allOn = on.length === items.length;

              return (
                <fieldset key={category}>
                  <legend className="mb-2 flex w-full items-center justify-between gap-3">
                    <span className="nx-eyebrow">{category}</span>
                    <button
                      type="button"
                      className="text-[0.75rem] font-semibold text-brand-text hover:underline"
                      onClick={() => setGroup(items, !allOn)}
                    >
                      {allOn ? "None" : "All"}
                    </button>
                  </legend>

                  <div className="grid gap-2 sm:grid-cols-2">
                    {items.map((item) => (
                      <label
                        key={item.key}
                        className={cn(
                          "flex cursor-pointer items-start gap-2.5 rounded-card border p-3 transition-colors",
                          selected.includes(item.key)
                            ? "border-brand-line bg-brand-soft/40"
                            : "border-line hover:bg-hover"
                        )}
                      >
                        <Checkbox
                          checked={selected.includes(item.key)}
                          onChange={() => toggle(item.key)}
                        />
                        <span className="min-w-0">
                          <span className="block text-[0.8125rem] font-semibold">
                            {item.name}
                          </span>
                          <span className="mt-0.5 block text-[0.75rem] leading-relaxed text-ink-muted">
                            {item.description}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-line pt-4">
        <Button
          type="submit"
          variant="primary"
          icon="check"
          loading={saving}
          disabled={selected === null || (touched && !valid)}
        >
          {editing ? "Save changes" : "Create role"}
        </Button>

        {editing && (
          <Button
            type="button"
            variant="danger"
            icon="trash"
            disabled={saving}
            onClick={() => onDelete(role)}
          >
            Delete role
          </Button>
        )}
      </div>
    </Panel>
  );
}

export default RoleManager;
