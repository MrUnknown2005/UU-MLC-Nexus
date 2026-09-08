import { useEffect, useId, useRef } from "react";
import { cn } from "../../lib/cn.js";
import { useOnClickOutside } from "../../hooks/useOnClickOutside.js";

const ALIGN = {
  start: "left-0",
  end: "right-0",
  center: "left-1/2 -translate-x-1/2",
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
          style={{ width, maxWidth: "calc(100vw - 1.5rem)" }}
          className={cn(
            "nx-rise absolute top-[calc(100%+0.5rem)] z-40",
            "overflow-hidden rounded-panel border border-line-strong",
            "bg-surface shadow-pop",
            ALIGN[align],
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
