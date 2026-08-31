import { cn } from "../../lib/cn.js";

const TONES = {
  brand: "bg-brand",
  success: "bg-success",
  warn: "bg-warn",
  danger: "bg-danger",
  info: "bg-info",
  violet: "bg-violet",
};

/**
 * Determinate progress bar. Used for point standings and todo completion.
 *
 * `label` is required for the accessible name; a bare bar tells a screen-reader
 * user a percentage with no idea what it measures.
 */
export function Progress({
  value,
  max = 100,
  label,
  tone = "brand",
  size = "md",
  showValue = false,
  className,
}) {
  const safeMax = max > 0 ? max : 1;
  const clamped = Math.max(0, Math.min(Number(value) || 0, safeMax));
  const percent = (clamped / safeMax) * 100;

  return (
    <div className={cn("min-w-0", className)}>
      {(label || showValue) && (
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          {label && (
            <span className="text-[0.75rem] font-medium text-ink-muted">
              {label}
            </span>
          )}
          {showValue && (
            <span className="text-[0.75rem] font-semibold tabular-nums text-ink">
              {Math.round(percent)}%
            </span>
          )}
        </div>
      )}

      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        className={cn(
          "w-full overflow-hidden rounded-full bg-well",
          size === "sm" ? "h-1" : size === "lg" ? "h-2.5" : "h-1.5"
        )}
      >
        <div
          className={cn("h-full rounded-full transition-[width]", TONES[tone])}
          style={{
            width: `${percent}%`,
            transitionDuration: "var(--t-slow)",
            transitionTimingFunction: "var(--ease)",
          }}
        />
      </div>
    </div>
  );
}

export default Progress;
