import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/cn.js";
import { IconButton } from "./IconButton.jsx";
import { useFocusTrap } from "../../hooks/useFocusTrap.js";
import { useLockBodyScroll } from "../../hooks/useLockBodyScroll.js";

const WIDTHS = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-xl",
  xl: "max-w-3xl",
};

/**
 * Accessible modal dialog.
 *
 * Portalled to <body> so no ancestor's `overflow` or `transform` can clip it;
 * focus is trapped while open and returned to the trigger on close; Escape and
 * a backdrop press both dismiss unless the caller opts out for a destructive
 * flow that must be answered deliberately.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  size = "md",
  footer,
  dismissible = true,
  className,
  bodyClassName,
  children,
}) {
  const panelRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  useLockBodyScroll(open);
  useFocusTrap(panelRef, open);

  useEffect(() => {
    if (!open || !dismissible) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose?.();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, dismissible, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        aria-hidden="true"
        onClick={dismissible ? onClose : undefined}
        className="nx-fade absolute inset-0 bg-black/60 backdrop-blur-[2px]"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          "nx-toast-in relative flex max-h-[92dvh] w-full flex-col",
          "rounded-t-sheet sm:rounded-sheet",
          "border border-line-strong bg-surface shadow-pop",
          "focus:outline-none",
          WIDTHS[size],
          className
        )}
      >
        {(title || dismissible) && (
          <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div className="min-w-0">
              {title && (
                <h2
                  id={titleId}
                  className="nx-display text-base sm:text-lg"
                >
                  {title}
                </h2>
              )}
              {description && (
                <p
                  id={descriptionId}
                  className="mt-1.5 text-[0.8125rem] text-ink-muted"
                >
                  {description}
                </p>
              )}
            </div>

            {dismissible && (
              <IconButton
                icon="close"
                label="Close"
                size="sm"
                onClick={onClose}
                className="-mt-1 -mr-1.5"
              />
            )}
          </header>
        )}

        <div className={cn("nx-scroll-y min-h-0 flex-1 px-5 py-4", bodyClassName)}>
          {children}
        </div>

        {footer && (
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-4">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body
  );
}

export default Modal;
