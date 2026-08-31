/**
 * Every destination in the app, once.
 *
 * The sidebar, the command palette and the per-tab document title all read this
 * list. Before, the sidebar hard-coded nine `<NavItem>`s with emoji and the
 * page title existed nowhere — adding a tab meant editing it in three places
 * and forgetting the fourth.
 *
 * `gate` names the permission flag that reveals the tab; tabs with no gate are
 * visible to every signed-in member. `badge` names the count that decorates it.
 */
export const NAV_ITEMS = [
  {
    id: "overview",
    label: "Overview",
    icon: "home",
    title: "Overview",
    keywords: "home dashboard start rank standing summary",
  },
  {
    id: "profile",
    label: "Profile",
    icon: "user",
    title: "Your profile",
    keywords: "me account avatar photo bio password settings",
  },
  {
    id: "directory",
    label: "Directory",
    icon: "users",
    title: "Member directory",
    keywords: "people members contacts who search find",
  },
  {
    id: "todo",
    label: "Tasks",
    icon: "tasks",
    title: "Task board",
    badge: "overdue",
    keywords: "todo task board deadline assign due work",
  },
  {
    id: "members",
    label: "Members",
    icon: "user-check",
    title: "Member management",
    gate: "members",
    badge: "pending",
    keywords: "approve roles activate deactivate manage admin",
  },
  {
    id: "points",
    label: "Points",
    icon: "trophy",
    title: "Points & leaderboard",
    gate: "points",
    keywords: "score leaderboard award standings rank monthly",
  },
  {
    id: "activity",
    label: "History",
    icon: "history",
    title: "Admin activity",
    gate: "activity",
    keywords: "audit log trail admin actions history",
  },
  {
    id: "news",
    label: "News",
    icon: "newspaper",
    title: "Announcements",
    gate: "news",
    badge: "news",
    keywords: "announcement post publish article notice",
  },
  {
    id: "roles",
    label: "Roles",
    icon: "shield",
    title: "Roles & permissions",
    gate: "roles",
    keywords: "permission access rbac role manage security",
  },
];

/**
 * Filters NAV_ITEMS down to what this member may open.
 *
 * `gates` is `{ members: bool, points: bool, activity: bool, news: bool,
 * roles: bool }` — the same booleans the dashboard already computes.
 */
export function visibleNavItems(gates) {
  return NAV_ITEMS.filter((item) => !item.gate || gates[item.gate]);
}

/** The `<title>` for a tab, or the app name when the tab is unknown. */
export function documentTitleFor(tabId) {
  const match = NAV_ITEMS.find((item) => item.id === tabId);
  return match ? `${match.title} · UU MLC Nexus` : "UU MLC Nexus";
}
