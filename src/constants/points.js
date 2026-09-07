/**
 * Largest single point adjustment allowed from the client, in either direction.
 *
 * Enforced in two places that must agree: the award form (`Points.jsx`) so the
 * field rejects it before submit, and the action layer (`useMemberActions`) so
 * no caller can slip an out-of-range value past the form. Without a bound,
 * values like `1e21` pass `Number.isInteger` and would be sent verbatim.
 * Authoritative enforcement belongs to the `award_points` RPC (Phase 4).
 */
export const MAX_POINT_ADJUSTMENT = 100000;
