import { useId } from "react";
import { cn } from "../../lib/cn.js";
import { Field } from "./Field.jsx";

/**
 * Multi-line input. `field-sizing: content` in base.css grows it as you type,
 * so long news bodies stop hiding inside a three-row box.
 */
export function TextArea({
  id: providedId,
  label,
  hint,
  error,
  required,
  optional,
  maxLength,
  value,
  className,
  fieldClassName,
  ...rest
}) {
  const autoId = useId();
  const id = providedId ?? autoId;

  const remaining =
    maxLength && typeof value === "string" ? maxLength - value.length : null;

  return (
    <Field
      id={id}
      label={label}
      hint={hint}
      error={error}
      required={required}
      optional={optional}
      className={fieldClassName}
    >
      {({ describedBy }) => (
        <div className="relative">
          <textarea
            id={id}
            required={required}
            maxLength={maxLength}
            value={value}
            aria-invalid={error ? "true" : undefined}
            aria-describedby={describedBy}
            className={cn("nx-textarea", remaining !== null && "pb-7", className)}
            {...rest}
          />
          {remaining !== null && (
            <span
              className={cn(
                "pointer-events-none absolute right-3 bottom-2 text-[0.6875rem] tabular-nums",
                remaining < 20 ? "text-warn" : "text-ink-subtle"
              )}
            >
              {remaining}
            </span>
          )}
        </div>
      )}
    </Field>
  );
}

export default TextArea;
