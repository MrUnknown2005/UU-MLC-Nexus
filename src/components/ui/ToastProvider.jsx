import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/cn.js";
import { Icon } from "./Icon.jsx";
import { ToastContext } from "./toast-context.js";

const TONES = {
  neutral: { icon: "info", chip: "bg-surface-3 text-ink-muted", rule: "bg-line-strong" },
  success: { icon: "check-circle", chip: "bg-success-soft text-success", rule: "bg-success" },
  error: { icon: "alert-triangle", chip: "bg-danger-soft text-danger", rule: "bg-danger" },
  warn: { icon: "alert-triangle", chip: "bg-warn-soft text-warn", rule: "bg-warn" },
  info: { icon: "info", chip: "bg-info-soft text-info", rule: "bg-info" },
};

const DEFAULT_DURATION = 4200;
const ERROR_DURATION = 7000;
const MAX_VISIBLE = 4;

/**
 * Toast host.
 *
 * Replaces `window.alert()` everywhere. `alert()` blocks the main thread,
 * cannot be styled, gives no room for context, and — the reason it had to go —
 * fires so late in an async handler that members regularly clicked away before
 * seeing it.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());
  const nextId = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((t) => t.id !== id));

    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (tone, message, options = {}) => {
      nextId.current += 1;
      const id = `toast-${nextId.current}`;

      const duration =
        options.duration ??
        (tone === "error" ? ERROR_DURATION : DEFAULT_DURATION);

      setToasts((current) => {
        const next = [
          ...current,
          {
            id,
            tone,
            message,
            description: options.description,
            action: options.action,
          },
        ];
        // Oldest fall off rather than stacking into a wall the member has to
        // dismiss one by one.
        return next.slice(-MAX_VISIBLE);
      });

      if (duration !== Infinity) {
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), duration)
        );
      }

      return id;
    },
    [dismiss]
  );

  useEffect(
    () => () => {
      for (const timer of timers.current.values()) clearTimeout(timer);
      timers.current.clear();
    },
    []
  );

  // A plain object of methods rather than a callable with properties hung off
  // it: assigning onto a function after creating it is exactly the mutation
  // React's compiler refuses to memoize, and `toast.success(…)` reads better
  // at the call site than a bare `toast(…)` whose tone you have to guess.
  const value = useMemo(
    () => ({
      toast: {
        show: (message, options) => push("neutral", message, options),
        success: (message, options) => push("success", message, options),
        error: (message, options) => push("error", message, options),
        warn: (message, options) => push("warn", message, options),
        info: (message, options) => push("info", message, options),
      },
      dismiss,
    }),
    [push, dismiss]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      {createPortal(
        <div
          // `polite` and not `assertive`: a confirmation should not interrupt
          // whatever a screen reader is already reading.
          aria-live="polite"
          aria-atomic="false"
          className={cn(
            "pointer-events-none fixed z-[60] flex flex-col gap-2",
            "inset-x-3 bottom-3 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-[22rem]"
          )}
        >
          {toasts.map((item) => {
            const palette = TONES[item.tone] ?? TONES.neutral;

            return (
              <div
                key={item.id}
                role={item.tone === "error" ? "alert" : "status"}
                className={cn(
                  "nx-toast-in pointer-events-auto relative overflow-hidden",
                  "flex items-start gap-3 rounded-card border border-line-strong",
                  "bg-surface px-3.5 py-3 shadow-pop"
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn("absolute inset-y-0 left-0 w-0.5", palette.rule)}
                />

                <span
                  className={cn(
                    "mt-px grid h-6 w-6 shrink-0 place-items-center rounded-full",
                    palette.chip
                  )}
                >
                  <Icon name={palette.icon} size={13} strokeWidth={2} />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-[0.8125rem] leading-snug font-semibold text-ink">
                    {item.message}
                  </p>
                  {item.description && (
                    <p className="mt-0.5 text-[0.8125rem] leading-snug text-ink-muted">
                      {item.description}
                    </p>
                  )}
                  {item.action && (
                    <button
                      type="button"
                      onClick={() => {
                        item.action.onClick?.();
                        dismiss(item.id);
                      }}
                      className="mt-1.5 text-[0.8125rem] font-semibold text-brand-text underline decoration-brand-line underline-offset-2 hover:decoration-brand"
                    >
                      {item.action.label}
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => dismiss(item.id)}
                  aria-label="Dismiss"
                  className="-mt-0.5 -mr-1 grid h-6 w-6 shrink-0 place-items-center rounded-[7px] text-ink-subtle transition-colors hover:bg-hover hover:text-ink"
                >
                  <Icon name="close" size={13} />
                </button>
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export default ToastProvider;
