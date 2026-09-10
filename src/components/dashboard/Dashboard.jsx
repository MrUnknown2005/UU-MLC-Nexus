import { useEffect, useId, useMemo, useState } from "react";
import useDashboardController from "../../hooks/useDashboardController";
import { CommandPalette } from "../ui/CommandPalette.jsx";
import { Sheet } from "../ui/Sheet.jsx";
import { usePrivacyPolicy } from "../legal/privacy-context.js";
import { useHotkey } from "../../hooks/useHotkey.js";
import { humanizeToken } from "../../lib/format.js";
import TopBar from "./TopBar.jsx";
import { SideNav, SideNavList } from "./SideNav.jsx";
import { documentTitleFor, visibleNavItems } from "./navigation.js";
import PageSkeleton from "./PageSkeleton.jsx";
import { SkeletonRegion } from "../ui/Skeleton.jsx";
import { ErrorBoundary } from "../ui/ErrorBoundary.jsx";
import Overview from "../pages/Overview";
import Profile from "../pages/Profile";
import Directory from "../pages/Directory";
import Todo from "../pages/Todo";
import Members from "../pages/Members";
import Points from "../pages/Points";
import PointReset from "../pages/PointReset";
import AdminActivity from "../pages/AdminActivity";
import RoleManager from "../pages/RoleManager";
import News from "../pages/News";

// Tabs whose content comes from the shared dashboard load (useDashboardData).
// Only these show the initial-load skeleton; Profile, Todo and Roles fetch
// their own data and manage their own loading state.
const DATA_DRIVEN_TABS = new Set([
  "overview",
  "directory",
  "members",
  "points",
  "activity",
  "news",
]);

/**
 * The application shell.
 *
 * All state lives in `useDashboardController`; this file owns layout, the
 * command palette's contents, and which page is mounted. The previous version
 * also carried an injected `<style>` block of mobile patches — those are now
 * element defaults in `styles/base.css`, where they belong.
 */
export default function Dashboard({ profile, onLogout, reloadProfile }) {
  const {
    tab, setTab, sidebarOpen, setSidebarOpen, notificationsOpen, setNotificationsOpen,
    notifications, unreadNotificationCount, markAllNotificationsRead,
    clearOwnNotifications, clearAllNotifications, openNotification,
    pendingMemberCount, overdueTodoCount, recentNewsCount, members, rankedMembers, news,
    currentRank, pointHistory, previousMonth, canViewMembers, canManageMembers, canViewPoints,
    canViewHistory, canManageNews, canManageRoles, isAdmin, roleDefinitions, changeRole,
    toggleMemberActive, adjustPoints, canAwardPoints, isHeadAdmin, allPointHistory,
    deleteAllPointData, deleteMonthlyLeaderboard, hasPermission, resetAllPoints,
    resetMemberPoints, activityLog, deleteAdminActivityLog, loadData, logAdminAction,
    loadRoleAccess, canManageTodos, dataLoading,
  } = useDashboardController({ profile, reloadProfile, onLogout });

  const [paletteOpen, setPaletteOpen] = useState(false);

  // Ties the mobile hamburger's aria-controls to the nav Sheet's panel.
  const navSheetId = useId();

  const { openPrivacy } = usePrivacyPolicy();

  const canOpenMembers = canViewMembers || canManageMembers;

  const navItems = useMemo(
    () =>
      visibleNavItems({
        members: canOpenMembers,
        points: canViewPoints,
        activity: canViewHistory,
        news: canManageNews,
        roles: canManageRoles,
      }),
    [
      canOpenMembers,
      canViewPoints,
      canViewHistory,
      canManageNews,
      canManageRoles,
    ]
  );

  const badges = {
    overdue: overdueTodoCount,
    pending: canManageMembers ? pendingMemberCount : 0,
    news: recentNewsCount,
  };

  // Derived rather than corrected: if a permission is revoked while a member is
  // sitting on the tab it gated, the fallback happens in this render, not in an
  // effect one frame later.
  const activeItem = navItems.find((item) => item.id === tab) ?? navItems[0];
  const activeTab = activeItem?.id ?? "overview";

  // Show the skeleton only during the first data load of a data-driven tab, so
  // pages don't flash their empty states ("No members ranked yet") before the
  // shared queries land.
  const showSkeleton = dataLoading && DATA_DRIVEN_TABS.has(activeTab);

  // The tab is the closest thing this app has to a URL, so it belongs in the
  // title — it is what a member sees in a crowded row of browser tabs.
  useEffect(() => {
    document.title = documentTitleFor(activeTab);
  }, [activeTab]);

  useHotkey("mod+k", () => setPaletteOpen((open) => !open), {
    allowInInput: true,
  });

  // `roleDefinitions` rows are `{ role_key, name, description, is_system }`, so
  // a custom role shows its real name rather than a snake_case key.
  const roleLabel = useMemo(() => {
    const match = roleDefinitions?.find((role) => role.role_key === profile.role);
    return match?.name ?? humanizeToken(profile.role);
  }, [roleDefinitions, profile.role]);

  const commandGroups = useMemo(
    () => [
      {
        label: "Go to",
        items: navItems.map((item) => ({
          id: `nav-${item.id}`,
          label: item.label,
          icon: item.icon,
          keywords: item.keywords,
          hint: item.id === activeTab ? "current" : undefined,
          run: () => setTab(item.id),
        })),
      },
      {
        label: "Actions",
        items: [
          {
            id: "action-refresh",
            label: "Refresh club data",
            icon: "refresh",
            keywords: "reload sync fetch update",
            run: () => loadData(),
          },
          {
            id: "action-notifications",
            label: "Open notifications",
            icon: "bell",
            keywords: "alerts unread bell",
            hint:
              unreadNotificationCount > 0
                ? `${unreadNotificationCount} unread`
                : undefined,
            run: () => setNotificationsOpen(true),
          },
          ...(unreadNotificationCount > 0
            ? [
                {
                  id: "action-mark-read",
                  label: "Mark all notifications read",
                  icon: "check-circle",
                  keywords: "clear dismiss unread",
                  run: () => markAllNotificationsRead(),
                },
              ]
            : []),
          {
            id: "action-logout",
            label: "Sign out",
            icon: "log-out",
            keywords: "logout leave exit quit",
            run: () => onLogout(),
          },
        ],
      },
    ],
    [
      navItems,
      activeTab,
      setTab,
      loadData,
      setNotificationsOpen,
      unreadNotificationCount,
      markAllNotificationsRead,
      onLogout,
    ]
  );

  return (
    <div className="min-h-dvh bg-canvas">
      <a
        href="#nexus-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[80] focus:rounded-control focus:bg-brand focus:px-3 focus:py-2 focus:text-[0.8125rem] focus:font-semibold focus:text-brand-ink"
      >
        Skip to content
      </a>

      {/* Desktop rail — fixed so long pages never scroll the navigation away.
          A plain <div>, not <aside>: the real landmark is the <nav> inside
          SideNav, and wrapping it in a complementary region would demote the
          app's primary navigation. */}
      <div className="fixed inset-y-0 left-0 z-30 hidden w-[var(--rail-w)] border-r border-line bg-surface lg:block">
        <SideNav
          items={navItems}
          tab={activeTab}
          onSelect={setTab}
          badges={badges}
          profile={profile}
          roleLabel={roleLabel}
        />
      </div>

      <Sheet
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        side="left"
        title="UU MLC Nexus"
        eyebrow="Navigate"
        id={navSheetId}
      >
        <SideNavList
          items={navItems}
          tab={activeTab}
          onSelect={setTab}
          badges={badges}
        />
      </Sheet>

      <div className="lg:pl-[var(--rail-w)]">
        <TopBar
          title={activeItem?.title ?? "Overview"}
          profile={profile}
          roleLabel={roleLabel}
          onOpenMenu={() => setSidebarOpen(true)}
          menuOpen={sidebarOpen}
          menuId={navSheetId}
          onOpenPalette={() => setPaletteOpen(true)}
          onSelectTab={setTab}
          onLogout={onLogout}
          notifications={notifications}
          notificationsOpen={notificationsOpen}
          setNotificationsOpen={setNotificationsOpen}
          unreadCount={unreadNotificationCount}
          onMarkAllRead={markAllNotificationsRead}
          onClearOwn={clearOwnNotifications}
          onClearAll={isHeadAdmin ? clearAllNotifications : undefined}
          onOpenNotification={openNotification}
        />

        <main
          id="nexus-main"
          className="nx-backdrop mx-auto min-h-[calc(100dvh-var(--topbar-h))] w-full max-w-[var(--shell-max)] px-3 py-5 sm:px-5 sm:py-7"
        >
          {/* Keyed so switching tabs replays the entrance animation and resets
              any per-page state instead of leaking it across sections. */}
          <div key={activeTab} className="nx-rise">
            {/* Page-scoped so a render crash in one tab shows a contained
                fallback while the rail and TopBar stay usable; the keyed parent
                remounts this on tab switch, so navigating away clears a caught
                error too. */}
            <ErrorBoundary inline>
            <SkeletonRegion
              loading={showSkeleton}
              label="Loading dashboard"
              fallback={<PageSkeleton />}
            >
              {activeTab === "overview" && (
                <Overview
                  profile={profile}
                  rankedMembers={rankedMembers}
                  news={news}
                  currentRank={currentRank}
                  pointHistory={pointHistory}
                  previousMonth={previousMonth}
                />
              )}

              {activeTab === "profile" && (
                <Profile
                  profile={profile}
                  reloadProfile={reloadProfile}
                  onLogAction={logAdminAction}
                />
              )}

              {activeTab === "directory" && (
                <Directory members={rankedMembers} currentUserId={profile.id} />
              )}

              {activeTab === "todo" && (
                <Todo
                  profile={profile}
                  isAdmin={isAdmin || canManageTodos}
                  onLogAction={logAdminAction}
                />
              )}

              {activeTab === "members" && canOpenMembers && (
                <Members
                  members={members}
                  currentUserId={profile.id}
                  currentUserRole={profile.role}
                  canEdit={canManageMembers}
                  canManageRoles={canManageRoles}
                  roleDefinitions={roleDefinitions}
                  onRoleChange={changeRole}
                  onToggleActive={toggleMemberActive}
                />
              )}

              {activeTab === "points" && canViewPoints && (
                <div className="space-y-7">
                  <Points
                    members={rankedMembers}
                    history={pointHistory}
                    allHistory={allPointHistory}
                    onAdjust={adjustPoints}
                    canAwardPoints={canAwardPoints}
                    canSeeAllPointHistory={canViewHistory}
                    isHeadAdmin={isHeadAdmin}
                    onDeleteAllPointData={deleteAllPointData}
                    onDeleteMonthlyLeaderboard={deleteMonthlyLeaderboard}
                  />

                  {hasPermission("reset_points") && (
                    <PointReset
                      members={rankedMembers}
                      onResetAll={resetAllPoints}
                      onResetMember={resetMemberPoints}
                    />
                  )}
                </div>
              )}

              {activeTab === "activity" && canViewHistory && (
                <AdminActivity
                  activityLog={activityLog}
                  members={members}
                  isHeadAdmin={isHeadAdmin}
                  onWipe={deleteAdminActivityLog}
                />
              )}

              {activeTab === "news" && canManageNews && (
                <News
                  news={news}
                  profile={profile}
                  reload={loadData}
                  onLogAction={logAdminAction}
                />
              )}

              {activeTab === "roles" && canManageRoles && (
                <RoleManager
                  currentUser={profile}
                  roleDefinitions={roleDefinitions}
                  onRolesChanged={loadRoleAccess}
                />
              )}
            </SkeletonRegion>
            </ErrorBoundary>
          </div>

          <footer className="nx-safe-bottom nx-eyebrow mt-8 flex justify-center border-t border-line pt-5 sm:justify-end">
            <button
              type="button"
              onClick={openPrivacy}
              className="underline decoration-line-strong underline-offset-2 transition-colors hover:text-ink"
            >
              Privacy Policy
            </button>
          </footer>
        </main>
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        groups={commandGroups}
      />
    </div>
  );
}
