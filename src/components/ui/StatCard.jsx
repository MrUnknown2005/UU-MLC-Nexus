import { cn } from "../../lib/cn.js";
import { Icon } from "./Icon.jsx";
import { Skeleton } from "./Skeleton.jsx";

const TONES = {
  brand: { chip: "bg-brand-soft text-brand-text", rule: "bg-brand" },
  violet: { chip: "bg-violet-soft text-violet", rule: "bg-violet" },
  info: { chip: "bg-info-soft text-info", rule: "bg-info" },
  success: { chip: "bg-success-soft text-success", rule: "bg-success" },
  warn: { chip: "bg-warn-soft text-warn", rule: "bg-warn" },
  danger: { chip: "bg-danger-soft text-danger", rule: "bg-danger" },
};

/**
 * A single headline number.
 *
 * The value is the loudest thing in the tile and uses tabular figures, so a
 * row of these stays optically aligned as points change.
 */
export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "brand",
  delta,
  loading = false,
  className,
}) {
  const palette = TONES[tone] ?? TONES.brand;

  return (
    <div
      className={cn(
        "nx-card nx-lift relative overflow-hidden px-4 py-3.5",
        className
      )}
    >
      {/* Hairline accent instead of a coloured background — keeps four tiles
          in a row from looking like a set of warning banners. */}
      <span
        aria-hidden="true"
        className={cn("absolute inset-x-0 top-0 h-px opacity-60", palette.rule)}
      />

      <div className="flex items-start justify-between gap-3">
        <p className="nx-eyebrow">{label}</p>
        {icon && (
          <span
            className={cn(
              "grid h-7 w-7 shrink-0 place-items-center rounded-[8px]",
              palette.chip
            )}
          >
            <Icon name={icon} size={14} />
          </span>
        )}
      </div>

      {loading ? (
        <Skeleton className="mt-2.5 h-8 w-20" />
      ) : (
        <p className="nx-display mt-1.5 text-[1.75rem] tabular-nums">{value}</p>
      )}

      <div className="mt-1 flex items-center gap-2">
        {delta && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-[0.75rem] font-semibold tabular-nums",
              delta.direction === "up" ? "text-success" : "text-danger"
            )}
          >
            <Icon
              name={delta.direction === "up" ? "arrow-up" : "arrow-down"}
              size={11}
              strokeWidth={2.5}
            />
            {delta.label}
          </span>
        )}
        {hint && <p className="text-[0.75rem] text-ink-subtle">{hint}</p>}
      </div>
    </div>
  );
}

export default StatCard;
