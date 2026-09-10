import { useEffect, useId, useRef } from "react";
import { cn } from "../../lib/cn.js";
import { useOnClickOutside } from "../../hooks/useOnClickOutside.js";

// Horizontal anchor, applied only at sm+ where the panel is absolutely
// positioned against its trigger. On mobile the panel is a fixed sheet pinned
// to the viewport gutters instead (see the panel classes below), so these
// don't apply there. Each alignment sets exactly one of left/right and forces
// the other to auto, so nothing collides with the mobile `inset-x-3`.
const ALIGN_SM = {
  start: "sm:left-0 sm:right-auto",
  end: "sm:right-0 sm:left-auto",
  center: "sm:left-1/2 sm:right-auto sm:-translate-x-1/2",
};

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Anchored panel attached to a trigger — notifications, row menus, filters.
 *
 * Both trigger and panel live inside one wrapper, so the outside-press check
 * cannot mistake a click on the trigger for a click outside and immediately
 * reopen what it just closed. Escape closes and returns focus to the trigger.
 */
export function Popover({
  open,
  onOpenChange,
  renderTrigger,
  label,
  align = "end",
  width = "20rem",
  className,
  children,
}) {
  const wrapRef = useRef(null);
  const panelRef = useRef(null);
  const skipRestore = useRef(false);
  const panelId = useId();

  useOnClickOutside(
    wrapRef,
    () => {
      // An outside press moves focus somewhere on purpose (or to nothing);
      // unlike Escape or a selection, it shouldn't be wrenched back to trigger.
      skipRestore.current = true;
      onOpenChange(false);
    },
    open
  );

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      onOpenChange(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  // Place focus inside the panel when it opens and return it to the trigger
  // when it closes via Escape or a selection — this role="dialog" previously
  // left keyboard focus stranded behind it and relied on a fragile
  // "first button in the wrapper" guess to restore (WCAG 2.4.3). Deliberately
  // non-modal: focus is moved, not trapped, so the underlying page stays live.
  useEffect(() => {
    if (!open) return undefined;

    const trigger = document.activeElement;
    const first = panelRef.current?.querySelector(FOCUSABLE);
    (first ?? panelRef.current)?.focus?.({ preventScroll: true });

    return () => {
      if (!skipRestore.current) trigger?.focus?.({ preventScroll: true });
      skipRestore.current = false;
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      {renderTrigger({
        onClick: () => onOpenChange(!open),
        "aria-expanded": open,
        "aria-haspopup": "dialog",
        "aria-controls": open ? panelId : undefined,
      })}

      {open && (
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-label={label}
          style={{ "--pop-w": width }}
          className={cn(
            "nx-rise z-40 overflow-hidden rounded-panel border border-line-strong",
            "bg-surface shadow-pop",
            // Mobile: a fixed sheet pinned to the viewport gutters, just below
            // the top bar. Both Popovers live in that bar, whose backdrop-blur
            // makes it the containing block for a fixed child, so left/right
            // resolve to viewport gutters and `top` clears the bar (plus the
            // notch safe-area). This is what stops a wide panel anchored to an
            // inset trigger — the bell, which is not the rightmost control —
            // from spilling off the LEFT edge of a phone.
            "fixed inset-x-3 w-auto top-[calc(env(safe-area-inset-top,0px)+var(--topbar-h)+0.5rem)]",
            // sm+: revert to a panel anchored against the trigger at the
            // requested width, clamped so it never exceeds the viewport.
            "sm:absolute sm:top-[calc(100%+0.5rem)] sm:w-[var(--pop-w)] sm:max-w-[calc(100vw-1.5rem)]",
            ALIGN_SM[align],
            className
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export default Popover;
