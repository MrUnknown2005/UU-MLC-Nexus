import { useEffect, useId, useRef } from "react";
import { cn } from "../../lib/cn.js";
import { useOnClickOutside } from "../../hooks/useOnClickOutside.js";

const ALIGN = {
  start: "left-0",
  end: "right-0",
  center: "left-1/2 -translate-x-1/2",
};

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
  const panelId = useId();

  useOnClickOutside(wrapRef, () => onOpenChange(false), open);

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      onOpenChange(false);
      wrapRef.current?.querySelector("button")?.focus();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

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
