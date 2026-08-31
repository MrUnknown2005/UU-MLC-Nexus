import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/cn.js";
import { IconButton } from "./IconButton.jsx";
import { useFocusTrap } from "../../hooks/useFocusTrap.js";
import { useLockBodyScroll } from "../../hooks/useLockBodyScroll.js";

const SIDES = {
  left: {
    position: "left-0 top-0 h-full border-r rounded-r-sheet",
    animation: "nx-sheet-left",
  },
  right: {
    position: "right-0 top-0 h-full border-l rounded-l-sheet",
    animation: "nx-sheet-right",
  },
};

/**
 * Edge-anchored panel. Used for navigation and filters on narrow screens,
 * where a centred modal would waste most of the viewport.
 *
 * Same focus and scroll guarantees as Modal — a sheet is a dialog.
 */
export function Sheet({
  open,
  onClose,
  side = "left",
  title,
  width = "19rem",
  className,
  children,
}) {
  const panelRef = useRef(null);
  const titleId = useId();
  const config = SIDES[side] ?? SIDES.left;

  useLockBodyScroll(open);
  useFocusTrap(panelRef, open);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        aria-hidden="true"
        onClick={onClose}
        className="nx-fade absolute inset-0 bg-black/55"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        style={{ width, maxWidth: "88vw" }}
        className={cn(
          "absolute flex flex-col border-line-strong bg-surface shadow-pop",
          "focus:outline-none",
          config.position,
          config.animation,
          className
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <p id={titleId} className="nx-eyebrow">
            {title}
          </p>
          <IconButton icon="close" label="Close" size="sm" onClick={onClose} />
        </div>

        <div className="nx-scroll-y min-h-0 flex-1">{children}</div>
      </div>
    </div>,
    document.body
  );
}

export default Sheet;
