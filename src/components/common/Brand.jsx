import { cn } from "../../lib/cn.js";

const MARK_SIZES = {
  xs: "h-6 w-6",
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-14 w-14",
  xl: "h-20 w-20",
};

/**
 * The club mark, drawn inline.
 *
 * `src/assets/club-logo.png` is 1254×1254 and just over 1 MB — a megabyte to
 * paint a 32px tile in the top bar, on every load, for every member. The mark
 * is flat geometry (a black ML monogram on marigold), so vector reproduces it
 * exactly at any size for no bytes at all, and stays crisp on a retina screen
 * where the raster was already being downscaled 30×.
 */
export function BrandMark({ size = "md", className }) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-[10px]",
        "bg-brand ring-1 ring-brand-line",
        MARK_SIZES[size] ?? MARK_SIZES.md,
        className
      )}
    >
      <svg
        viewBox="0 0 32 32"
        aria-hidden="true"
        className="h-full w-full"
        fill="none"
        stroke="var(--brand-ink)"
        strokeWidth="3"
        strokeLinecap="square"
        strokeLinejoin="miter"
      >
        <path d="M6 23V9l5.5 6.5L17 9v14" />
        <path d="M22 9v14h4.5" />
      </svg>
    </span>
  );
}

/**
 * Mark plus wordmark. `subtitle` is the small line under the name.
 */
export function Brand({ size = "md", subtitle, className }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <BrandMark size={size} />

      <span className="min-w-0">
        <span className="nx-display block text-[0.9375rem] leading-tight">
          UU MLC <span className="text-brand-text">Nexus</span>
        </span>
        {subtitle && (
          <span className="block truncate text-[0.6875rem] text-ink-subtle">
            {subtitle}
          </span>
        )}
      </span>
    </span>
  );
}

export default Brand;
