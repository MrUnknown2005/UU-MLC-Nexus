import { useCountUp } from "../../hooks/useCountUp.js";

/**
 * A number that counts up to `value` when it mounts or changes.
 *
 * Pass `format` to control how the settled figure reads (thousands separators,
 * a trailing %, an ordinal); it receives the rounded integer on every frame, so
 * the separators animate too. Without it the raw rounded number is shown.
 */
export function CountUp({ value, format, duration }) {
  const current = useCountUp(value, duration ? { duration } : undefined);
  const rounded = Math.round(current);
  return <>{format ? format(rounded) : rounded}</>;
}

export default CountUp;
