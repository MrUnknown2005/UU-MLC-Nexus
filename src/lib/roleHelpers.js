export const getRoleDisplayName = (roleKey, roleDefinitions = []) =>
  roleDefinitions.find((role) => role.role_key === roleKey)?.name ||
  roleKey ||
  "Unknown";
