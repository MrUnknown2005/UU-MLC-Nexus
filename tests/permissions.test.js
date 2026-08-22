import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import test from "node:test";
import {
  LEGACY_ROLE_PERMISSIONS,
  PERMISSION_CATALOG,
  PERMISSION_KEYS,
  ROLE_NAMES,
} from "../src/constants/roles.js";

const hasPermission = (role, permission) =>
  (LEGACY_ROLE_PERMISSIONS[role] || []).includes(permission);

const derivedAccess = (role) => {
  const permissions = LEGACY_ROLE_PERMISSIONS[role] || [];
  const canManageMembers = permissions.includes("manage_members");
  const canManageTodos = permissions.includes("manage_todos");
  const canViewMembers =
    permissions.includes("view_members") || canManageMembers;
  const canAwardPoints = permissions.includes("award_points");
  const canViewPoints =
    permissions.includes("view_points") || canAwardPoints;
  const canViewHistory = permissions.includes("view_history");
  const canManageNews = permissions.includes("manage_news");
  const canManageRoles = permissions.includes("manage_roles");
  const isAdmin =
    permissions.includes("view_admin") ||
    canViewMembers ||
    canViewHistory ||
    canManageNews ||
    canManageRoles;

  return {
    permissions,
    canManageMembers,
    canManageTodos,
    canViewMembers,
    canAwardPoints,
    canViewPoints,
    canViewHistory,
    canManageNews,
    canManageRoles,
    isAdmin,
  };
};

test("permission catalog contains unique keys", () => {
  assert.equal(new Set(PERMISSION_KEYS).size, PERMISSION_KEYS.length);
  assert.equal(PERMISSION_CATALOG.length, PERMISSION_KEYS.length);
  assert.deepEqual(
    PERMISSION_CATALOG.map((permission) => permission.key),
    PERMISSION_KEYS,
  );
});

test("guest has no permissions", () => {
  assert.deepEqual(LEGACY_ROLE_PERMISSIONS.guest, []);
  assert.equal(derivedAccess("guest").isAdmin, false);
});

test("member keeps the baseline read-only access", () => {
  const access = derivedAccess("member");

  assert.equal(hasPermission("member", "view_directory"), true);
  assert.equal(hasPermission("member", "view_todo"), true);
  assert.equal(hasPermission("member", "view_points"), true);
  assert.equal(access.canViewMembers, false);
  assert.equal(access.canAwardPoints, false);
  assert.equal(access.canManageMembers, false);
  assert.equal(access.isAdmin, false);
});

test("executive has operational permissions but cannot manage members or reset points", () => {
  const access = derivedAccess("executive");

  assert.equal(access.isAdmin, true);
  assert.equal(access.canViewMembers, true);
  assert.equal(access.canManageTodos, true);
  assert.equal(access.canAwardPoints, true);
  assert.equal(access.canManageMembers, false);
  assert.equal(hasPermission("executive", "reset_points"), false);
  assert.equal(hasPermission("executive", "manage_roles"), false);
});

test("administrator has management and reset permissions but not role management", () => {
  const access = derivedAccess("administrator");

  assert.equal(access.isAdmin, true);
  assert.equal(access.canManageMembers, true);
  assert.equal(access.canAwardPoints, true);
  assert.equal(access.canViewHistory, true);
  assert.equal(access.canManageNews, true);
  assert.equal(hasPermission("administrator", "reset_points"), true);
  assert.equal(hasPermission("administrator", "manage_roles"), false);
  assert.equal(hasPermission("administrator", "view_analytics"), true);
});

test("head admin receives the complete permission catalog", () => {
  assert.deepEqual(LEGACY_ROLE_PERMISSIONS.head_admin, PERMISSION_KEYS);
  assert.equal(derivedAccess("head_admin").canManageRoles, true);
  assert.equal(derivedAccess("head_admin").isAdmin, true);
});

test("role names cover every system role", () => {
  for (const role of Object.keys(LEGACY_ROLE_PERMISSIONS)) {
    assert.equal(typeof ROLE_NAMES[role], "string");
    assert.ok(ROLE_NAMES[role].length > 0);
  }
});

test("service layer owns Supabase imports for extracted hooks", () => {
  const root = resolve(process.cwd());
  const extractedHooks = [
    "src/hooks/usePermissions.js",
    "src/hooks/useAdminAudit.js",
    "src/hooks/useNotifications.js",
    "src/hooks/useDashboardData.js",
    "src/hooks/useMemberActions.js",
  ];
  const services = [
    "src/services/permissionService.js",
    "src/services/adminAuditService.js",
    "src/services/notificationService.js",
    "src/services/dashboardService.js",
    "src/services/memberService.js",
  ];

  for (const file of extractedHooks) {
    const content = readFileSync(resolve(root, file), "utf8");
    assert.doesNotMatch(
      content,
      /from\s+["']\.\.\/lib\/supabaseClient["']/,
      `${file} should not import Supabase directly`,
    );
  }

  for (const file of services) {
    const content = readFileSync(resolve(root, file), "utf8");
    assert.match(
      content,
      /from\s+["']\.\.\/lib\/supabaseClient["']/,
      `${file} should own the Supabase data-access import`,
    );
  }
});
