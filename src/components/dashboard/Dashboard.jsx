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

      <div className="nexus-mobile-root min-h-screen bg-[#0b0b0d] text-white">
        <Header profile={profile} onLogout={onLogout} />

        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
          <div className="mb-5 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-gray-500 text-sm">Workspace</p>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black mt-1">
                UU MLC Nexus
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setNotificationsOpen((value) => !value)}
                  className="relative w-11 h-11 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition flex items-center justify-center"
                  aria-label="Notifications"
                  aria-expanded={notificationsOpen}
                >
                  <span className="text-lg">🔔</span>

                  {unreadNotificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {unreadNotificationCount > 99
                        ? "99+"
                        : unreadNotificationCount}
                    </span>
                  )}
                </button>

                {notificationsOpen && (
                  <div className="absolute right-0 top-12 z-50 w-[calc(100vw-1.5rem)] max-w-80 rounded-2xl bg-[#151519] border border-white/10 shadow-2xl overflow-hidden">
                    <div className="flex items-center justify-between gap-3 p-4 border-b border-white/10">
                      <div>
                        <p className="font-semibold">Notifications</p>
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
                          className="text-xs text-yellow-400 hover:text-yellow-300"
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
                            className={`w-full text-left p-4 border-b border-white/5 hover:bg-white/5 transition ${
                              notification.read_at ? "" : "bg-yellow-400/[0.04]"
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
                                    <span className="w-2 h-2 rounded-full bg-yellow-400 shrink-0 mt-1.5" />
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
                className="lg:hidden px-4 py-3 rounded-xl bg-white/5 border border-white/10"
              >
                ☰ Menu
              </button>
            </div>
          </div>

          {unreadNotificationCount > 0 && (
            <section className="mb-6 rounded-3xl border border-yellow-400/20 bg-yellow-400/[0.04] p-5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <p className="text-yellow-400 text-sm font-semibold">
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
                        className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-gray-300 hover:bg-white/10 transition"
                      >
                        👥 {pendingMemberCount} pending
                      </button>
                    )}

                    {overdueTodoCount > 0 && (
                      <button
                        onClick={() => setTab("todo")}
                        className="px-3 py-2 rounded-xl bg-red-500/10 border border-red-400/20 text-xs text-red-300 hover:bg-red-500/20 transition"
                      >
                        ✓ {overdueTodoCount} overdue
                      </button>
                    )}

                    {recentNewsCount > 0 && (
                      <button
                        onClick={() => setTab("news")}
                        className="px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-400/20 text-xs text-blue-300 hover:bg-blue-500/20 transition"
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
              <div className="lg:sticky lg:top-6 bg-white/[0.04] border border-white/10 rounded-2xl sm:rounded-3xl p-2 sm:p-3 backdrop-blur-xl max-h-[70vh] overflow-y-auto">
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
                  className="w-full mt-2 sm:mt-3 px-3 sm:px-4 py-3.5 sm:py-3 rounded-xl sm:rounded-2xl text-left text-sm sm:text-base text-red-300 hover:bg-red-500/10 transition"
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
