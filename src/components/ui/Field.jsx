import { cn } from "../../lib/cn.js";
import { Icon } from "./Icon.jsx";

/**
 * Label + hint + error scaffolding shared by every form control.
 *
 * `children` may be a function; it receives `{ describedBy }` so the control
 * can point `aria-describedby` at whichever of hint/error is currently
 * rendered. Plain inputs should use TextInput / TextArea / Select, which wrap
 * this and guarantee the label is wired to the control.
 */
export function Field({
  id,
  label,
  hint,
  error,
  required = false,
  optional = false,
  className,
  labelClassName,
  children,
}) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div className={cn("min-w-0", className)}>
      {label && (
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <label
            htmlFor={id}
            className={cn(
              "text-[0.8125rem] font-semibold text-ink",
              labelClassName
            )}
          >
            {label}
            {required && (
              <span className="ml-0.5 text-danger" aria-hidden="true">
                *
              </span>
            )}
          </label>
          {optional && (
            <span className="text-[0.6875rem] text-ink-subtle">Optional</span>
          )}
        </div>
      )}

      {typeof children === "function" ? children({ describedBy }) : children}

      {error ? (
        <p
          id={errorId}
          className="mt-1.5 flex items-start gap-1.5 text-[0.8125rem] text-danger"
        >
          <Icon name="alert-triangle" size={13} className="mt-0.5 shrink-0" />
          {error}
        </p>
      ) : (
        hint && (
          <p id={hintId} className="mt-1.5 text-[0.8125rem] text-ink-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

export default Field;
