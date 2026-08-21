import useDashboardController from "../../hooks/useDashboardController";
import Header from "../common/Header";
import NavItem from "../common/NavItem";
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

export default function Dashboard({ profile, onLogout, reloadProfile }) {
  const {
    tab, setTab, sidebarOpen, setSidebarOpen, notificationsOpen, setNotificationsOpen,
    notifications, unreadNotificationCount, markAllNotificationsRead, openNotification,
    pendingMemberCount, overdueTodoCount, recentNewsCount, members, rankedMembers, news,
    currentRank, pointHistory, previousMonth, canViewMembers, canManageMembers, canViewPoints,
    canViewHistory, canManageNews, canManageRoles, isAdmin, roleDefinitions, changeRole,
    toggleMemberActive, adjustPoints, canAwardPoints, isHeadAdmin, allPointHistory,
    deleteAllPointData, deleteMonthlyLeaderboard, hasPermission, resetAllPoints,
    resetMemberPoints, activityLog, deleteAdminActivityLog, loadData, logAdminAction,
    loadRoleAccess, canManageTodos,
  } = useDashboardController({ profile, reloadProfile, onLogout });


  return (
    <>
      <style>{`
        .nexus-mobile-root {
          overflow-x: hidden;
          /* Explicitly visible: setting only overflow-x makes some browsers
             silently compute overflow-y as "auto" too, creating a second,
             independent scrollbar on this element in addition to the page's. */
          overflow-y: visible;
        }

        .nexus-mobile-root input,
        .nexus-mobile-root textarea,
        .nexus-mobile-root select,
        .nexus-mobile-root button {
          max-width: 100%;
        }

        .nexus-mobile-root img {
          max-width: 100%;
        }

        @media (max-width: 640px) {
          .nexus-mobile-root section,
          .nexus-mobile-root article {
            min-width: 0;
          }

          .nexus-mobile-root h1,
          .nexus-mobile-root h2,
          .nexus-mobile-root h3,
          .nexus-mobile-root h4,
          .nexus-mobile-root p {
            overflow-wrap: anywhere;
          }

          .nexus-mobile-root button,
          .nexus-mobile-root select,
          .nexus-mobile-root input,
          .nexus-mobile-root textarea {
            min-height: 44px;
          }

          .nexus-mobile-root input[type="file"] {
            min-height: auto;
          }
        }
      `}</style>

      <div className="nexus-mobile-root nexus-app-bg min-h-screen text-white">
        {/* Decorative glow blobs */}
        <div className="nexus-glow-yellow w-[26rem] h-[26rem] -top-32 -left-32" />
        <div className="nexus-glow-purple w-[28rem] h-[28rem] top-1/3 -right-40" />
        <div className="nexus-glow-cyan w-[22rem] h-[22rem] bottom-0 left-10" />
        <div className="nexus-glow-pink w-[18rem] h-[18rem] top-1/4 right-1/3" />

        <Header profile={profile} onLogout={onLogout} />

        <div className="relative max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8 z-10">
          <div className="mb-5 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-yellow-300 text-xs uppercase tracking-[0.3em]">
                Workspace
              </p>
              <h1 className="text-xl sm:text-2xl md:text-4xl font-black mt-1">
                <span className="nexus-text-aurora">UU MLC</span>{" "}
                <span className="nexus-text-ocean">Nexus</span>
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setNotificationsOpen((value) => !value)}
                  className="relative w-11 h-11 rounded-xl nexus-glass nexus-glass-hover transition flex items-center justify-center"
                  aria-label="Notifications"
                  aria-expanded={notificationsOpen}
                >
                  <span className="text-lg">🔔</span>

                  {unreadNotificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-gradient-to-br from-red-500 to-pink-500 text-white text-[10px] font-bold flex items-center justify-center shadow-[0_0_12px_rgba(239,68,68,0.6)]">
                      {unreadNotificationCount > 99
                        ? "99+"
                        : unreadNotificationCount}
                    </span>
                  )}
                </button>

                {notificationsOpen && (
                  <div className="absolute right-0 top-12 z-50 w-[calc(100vw-1.5rem)] max-w-80 nexus-modal rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between gap-3 p-4 border-b border-white/10 nexus-glass-overlay-aurora">
                      <div>
                        <p className="font-bold nexus-text-aurora">Notifications</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {unreadNotificationCount > 0
                            ? `${unreadNotificationCount} unread`
                            : "You're all caught up"}
                        </p>
                      </div>

                      {unreadNotificationCount > 0 && (
                        <button
                          type="button"
                          onClick={markAllNotificationsRead}
                          className="text-xs text-yellow-300 hover:text-yellow-200 font-semibold"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    {notifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <div className="text-3xl">🔔</div>
                        <p className="text-gray-400 mt-3">
                          No notifications yet.
                        </p>
                      </div>
                    ) : (
                      <div className="max-h-[28rem] overflow-y-auto">
                        {notifications.map((notification) => (
                          <button
                            key={notification.id}
                            type="button"
                            onClick={() => openNotification(notification)}
                            className={`w-full text-left p-4 transition nexus-row rounded-none border-x-0 first:rounded-t-2xl last:rounded-b-2xl ${
                              notification.read_at
                                ? ""
                                : "nexus-row-unread"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <span className="text-lg">
                                {notification.type === "news"
                                  ? "📰"
                                  : notification.type === "todo"
                                    ? "✓"
                                    : notification.type === "points"
                                      ? "🏆"
                                      : notification.type === "member"
                                        ? "👥"
                                        : "🔔"}
                              </span>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-3">
                                  <p className="text-sm font-semibold">
                                    {notification.title}
                                  </p>

                                  {!notification.read_at && (
                                    <span className="nexus-dot-glow shrink-0 mt-1.5" />
                                  )}
                                </div>

                                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                                  {notification.message}
                                </p>

                                <p className="text-[11px] text-gray-600 mt-2">
                                  {new Date(
                                    notification.created_at,
                                  ).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={() => setSidebarOpen((value) => !value)}
                className="lg:hidden nexus-morphic-button-ghost px-4 py-3"
              >
                ☰ Menu
              </button>
            </div>
          </div>

          {unreadNotificationCount > 0 && (
            <section className="mb-6 nexus-glass-strong nexus-glass-yellow rounded-3xl p-5 relative overflow-hidden">
              <div className="absolute inset-0 nexus-glass-overlay-aurora pointer-events-none" />
              <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <p className="nexus-text-aurora text-sm font-bold">
                    {unreadNotificationCount}{" "}
                    {unreadNotificationCount === 1
                      ? "item needs"
                      : "items need"}{" "}
                    your attention
                  </p>

                  <div className="flex flex-wrap gap-2 mt-3">
                    {pendingMemberCount > 0 && (
                      <button
                        onClick={() => setTab("members")}
                        className="nexus-morphic-button-ghost text-xs"
                      >
                        👥 {pendingMemberCount} pending
                      </button>
                    )}

                    {overdueTodoCount > 0 && (
                      <button
                        onClick={() => setTab("todo")}
                        className="nexus-morphic-button-ghost text-xs hover:!text-red-300 hover:!border-red-400/30"
                      >
                        ✓ {overdueTodoCount} overdue
                      </button>
                    )}

                    {recentNewsCount > 0 && (
                      <button
                        onClick={() => setTab("news")}
                        className="nexus-morphic-button-ghost text-xs hover:!text-cyan-200 hover:!border-cyan-400/30"
                      >
                        📰 {recentNewsCount} recent
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 items-stretch lg:items-start">
            <aside
              className={`${sidebarOpen ? "block" : "hidden"} lg:block w-full lg:w-64 flex-shrink-0`}
            >
              <div className="lg:sticky lg:top-6 nexus-panel rounded-2xl sm:rounded-3xl p-2 sm:p-3">
                <NavItem
                  active={tab === "overview"}
                  onClick={() => setTab("overview")}
                  icon="⌂"
                >
                  Overview
                </NavItem>
                <NavItem
                  active={tab === "profile"}
                  onClick={() => setTab("profile")}
                  icon="◉"
                >
                  Profile
                </NavItem>
                <NavItem
                  active={tab === "directory"}
                  onClick={() => setTab("directory")}
                  icon="👥"
                >
                  Directory
                </NavItem>
                <NavItem
                  active={tab === "todo"}
                  onClick={() => setTab("todo")}
                  icon="✓"
                  badge={overdueTodoCount}
                >
                  To-Do
                </NavItem>
                {(canViewMembers || canManageMembers) && (
                  <NavItem
                    active={tab === "members"}
                    onClick={() => setTab("members")}
                    icon="♟"
                    badge={canManageMembers ? pendingMemberCount : 0}
                  >
                    Members
                  </NavItem>
                )}
                {canViewPoints && (
                  <NavItem
                    active={tab === "points"}
                    onClick={() => setTab("points")}
                    icon="🏆"
                  >
                    Points
                  </NavItem>
                )}

                {canViewHistory && (
                  <NavItem
                    active={tab === "activity"}
                    onClick={() => setTab("activity")}
                    icon="▤"
                  >
                    History
                  </NavItem>
                )}
                {canManageNews && (
                  <NavItem
                    active={tab === "news"}
                    onClick={() => setTab("news")}
                    icon="📰"
                    badge={recentNewsCount}
                  >
                    News
                  </NavItem>
                )}
                {canManageRoles && (
                  <NavItem
                    active={tab === "roles"}
                    onClick={() => setTab("roles")}
                    icon="⚙"
                  >
                    Roles & Permissions
                  </NavItem>
                )}
                <button
                  onClick={onLogout}
                  className="nexus-glass-button nexus-glass-button-danger w-full mt-2 sm:mt-3 px-3 sm:px-4 py-3 sm:py-2.5 justify-start text-sm sm:text-base"
                >
                  ↪ Sign out
                </button>
              </div>
            </aside>

            <main className="min-w-0 flex-1">
              {/* Overview */}
              {tab === "overview" && (
                <Overview
                  profile={profile}
                  rankedMembers={rankedMembers}
                  news={news}
                  currentRank={currentRank}
                  pointHistory={pointHistory}
                  previousMonth={previousMonth}
                />
              )}

              {/* Profile */}
              {tab === "profile" && (
                <Profile
                  profile={profile}
                  reloadProfile={reloadProfile}
                  onLogAction={logAdminAction}
                />
              )}

              {/* Directory */}
              {tab === "directory" && <Directory members={rankedMembers} />}

              {/* To-Do */}
              {tab === "todo" && (
                <Todo
                  profile={profile}
                  isAdmin={isAdmin || canManageTodos}
                  onLogAction={logAdminAction}
                />
              )}

              {/* Members */}
              {tab === "members" && (canViewMembers || canManageMembers) && (
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

              {/* Points */}
              {tab === "points" && canViewPoints && (
                <>
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
                    <div className="mt-8">
                      <PointReset
                        members={rankedMembers}
                        onResetAll={resetAllPoints}
                        onResetMember={resetMemberPoints}
                      />
                    </div>
                  )}
                </>
              )}

              {/* Admin activity */}
              {tab === "activity" && canViewHistory && (
                <AdminActivity
                  activityLog={activityLog}
                  members={members}
                  isHeadAdmin={isHeadAdmin}
                  onWipe={deleteAdminActivityLog}
                />
              )}

              {/* Roles & Permissions */}
              {tab === "roles" && canManageRoles && (
                <RoleManager
                  currentUser={profile}
                  roleDefinitions={roleDefinitions}
                  onRolesChanged={loadRoleAccess}
                />
              )}

              {/* News */}
              {tab === "news" && canManageNews && (
                <News
                  news={news}
                  profile={profile}
                  reload={loadData}
                  onLogAction={logAdminAction}
                />
              )}
            </main>
          </div>
        </div>
      </div>
    </>
  );
}
