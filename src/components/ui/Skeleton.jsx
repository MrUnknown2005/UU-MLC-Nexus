import { cn } from "../../lib/cn.js";

/**
 * Loading placeholder shaped like the content it replaces.
 *
 * Skeletons beat a spinner here because the dashboard loads six queries at
 * once: the layout settles immediately and only the values fade in, instead of
 * the whole page jumping when data lands.
 */
export function Skeleton({ className, rounded = "control", ...rest }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "nx-skeleton block",
        rounded === "full" && "rounded-full",
        rounded === "card" && "rounded-card",
        className
      )}
      {...rest}
    />
  );
}

/** A few lines of fake text. `lines` counts them; the last one is shorter. */
export function SkeletonText({ lines = 3, className }) {
  return (
    <span className={cn("flex flex-col gap-2", className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          className={cn("h-3.5", i === lines - 1 ? "w-2/5" : "w-full")}
        />
      ))}
    </span>
  );
}

/**
 * Wrapper that announces loading state to assistive tech, then swaps in the
 * real content. Without the live region a screen reader hears nothing at all
 * while a skeleton is on screen.
 */
export function SkeletonRegion({ loading, label = "Loading", children, fallback }) {
  return (
    <div aria-busy={loading || undefined} aria-live="polite">
      {loading ? (
        <>
          <span className="sr-only">{label}…</span>
          {fallback}
        </>
      ) : (
        children
      )}
    </div>
  );
}

export default Skeleton;
