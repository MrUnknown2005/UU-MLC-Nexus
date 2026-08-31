import { cn } from "../../lib/cn.js";

/**
 * Hover / focus hint.
 *
 * CSS-only via a group wrapper: no JS timers, no portal, and it appears on
 * keyboard focus as well as hover. Because it is `aria-hidden` and purely
 * supplementary, the trigger must still carry its own accessible name — a
 * tooltip is never the only place information lives.
 */
export function Tooltip({ content, side = "top", className, children }) {
  if (!content) return children;

  return (
    <span className={cn("group/tip relative inline-flex", className)}>
      {children}
      <span
        role="tooltip"
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute z-40 whitespace-nowrap",
          "rounded-[7px] border border-line-strong bg-surface-3 px-2 py-1",
          "text-[0.6875rem] font-medium text-ink shadow-pop",
          "opacity-0 transition-opacity duration-150",
          "group-hover/tip:opacity-100 group-focus-within/tip:opacity-100",
          side === "top" && "bottom-[calc(100%+0.375rem)] left-1/2 -translate-x-1/2",
          side === "bottom" && "top-[calc(100%+0.375rem)] left-1/2 -translate-x-1/2",
          side === "left" && "top-1/2 right-[calc(100%+0.375rem)] -translate-y-1/2",
          side === "right" && "top-1/2 left-[calc(100%+0.375rem)] -translate-y-1/2"
        )}
      >
        {content}
      </span>
    </span>
  );
}

export default Tooltip;
