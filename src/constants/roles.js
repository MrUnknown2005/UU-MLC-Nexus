export const ROLE_NAMES = {
  guest: "Guest",
  member: "Member",
  executive: "Executive",
  administrator: "Administrator",
  head_admin: "Head Administrator",
};

export const PERMISSION_CATALOG = [
  {
    key: "view_admin",
    name: "Admin Workspace",
    description:
      "Access the administration workspace and management navigation.",
    category: "Workspace",
  },
  {
    key: "view_directory",
    name: "View Directory",
    description: "Browse active club members in the directory.",
    category: "Members",
  },
  {
    key: "view_members",
    name: "View Member Management",
    description:
      "See the full member-management screen, including pending and inactive accounts.",
    category: "Members",
  },
  {
    key: "manage_members",
    name: "Manage Members",
    description:
      "Approve members, change roles, and activate or deactivate accounts.",
    category: "Members",
  },
  {
    key: "view_todo",
    name: "View To-Do",
    description: "Access club tasks and to-do views.",
    category: "Tasks",
  },
  {
    key: "manage_todos",
    name: "Manage To-Do",
    description: "Create and manage club tasks where supported.",
    category: "Tasks",
  },
  {
    key: "view_points",
    name: "View Points",
    description:
      "Open the points workspace and point history available to the role.",
    category: "Points",
  },
  {
    key: "award_points",
    name: "Award Points",
    description: "Add or remove member points.",
    category: "Points",
  },
  {
    key: "reset_points",
    name: "Reset Points",
    description: "Run point-reset operations.",
    category: "Points",
  },
  {
    key: "view_history",
    name: "View History",
    description: "View administrative activity history.",
    category: "Admin",
  },
  {
    key: "view_analytics",
    name: "View Analytics",
    description: "View club analytics and reporting data.",
    category: "Admin",
  },
  {
    key: "manage_news",
    name: "Manage News",
    description: "Create, edit, and delete club news.",
    category: "Content",
  },
  {
    key: "manage_roles",
    name: "Manage Roles",
    description: "Create custom roles and assign permissions.",
    category: "Security",
  },
];

export const PERMISSION_KEYS = PERMISSION_CATALOG.map((permission) => permission.key);

export const SYSTEM_ROLE_DEFINITIONS = [
  {
    role_key: "guest",
    name: "Guest",
    description: "Pending account with limited access.",
    is_system: true,
  },
  {
    role_key: "member",
    name: "Member",
    description: "Standard active club member.",
    is_system: true,
  },
  {
    role_key: "executive",
    name: "Executive",
    description: "Club executive with operational permissions.",
    is_system: true,
  },
  {
    role_key: "administrator",
    name: "Administrator",
    description: "Club administrator.",
    is_system: true,
  },
  {
    role_key: "head_admin",
    name: "Head Administrator",
    description: "Highest-level club administrator.",
    is_system: true,
  },
];

export const LEGACY_ROLE_PERMISSIONS = {
  guest: [],
  member: ["view_directory", "view_todo", "view_points"],
  executive: [
    "view_admin",
    "view_directory",
    "view_members",
    "view_todo",
    "manage_todos",
    "view_points",
    "award_points",
  ],
  administrator: [
    "view_admin",
    "view_directory",
    "view_members",
    "manage_members",
    "view_todo",
    "manage_todos",
    "view_points",
    "award_points",
    "reset_points",
    "view_history",
    "view_analytics",
    "manage_news",
  ],
  head_admin: PERMISSION_KEYS,
};
