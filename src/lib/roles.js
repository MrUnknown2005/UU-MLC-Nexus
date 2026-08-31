import { ROLE_NAMES } from "../constants/roles";
import { humanizeToken } from "./format.js";

/**
 * Human-readable name for a role key.
 *
 * Resolution order matters: a DB `role_definitions` row wins, because an admin
 * may have renamed a role; then the built-in names; then a best-effort
 * de-slugging of the key itself, so a role added directly in SQL still reads as
 * "Vice President" rather than `vice_president`.
 */
export function roleLabel(roleKey, roleDefinitions) {
  if (!roleKey) return "No role";

  const match = roleDefinitions?.find((role) => role.role_key === roleKey);
  if (match?.name) return match.name;

  return ROLE_NAMES[roleKey] ?? humanizeToken(roleKey);
}

/**
 * Colour tone for a role, so seniority is legible at a glance without a legend.
 * Returns a key into the `Badge` tone map.
 */
export function roleTone(roleKey) {
  switch (roleKey) {
    case "head_admin":
      return "brand";
    case "administrator":
      return "violet";
    case "executive":
      return "info";
    case "guest":
      return "warn";
    default:
      return "neutral";
  }
}

/** Icon for a role, matching `roleTone`'s hierarchy. */
export function roleIcon(roleKey) {
  switch (roleKey) {
    case "head_admin":
      return "crown";
    case "administrator":
      return "shield-check";
    case "executive":
      return "star";
    case "guest":
      return "clock";
    default:
      return "user";
  }
}
