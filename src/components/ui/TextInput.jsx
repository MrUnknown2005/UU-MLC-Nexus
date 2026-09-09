import { useId, useState } from "react";
import { cn } from "../../lib/cn.js";
import { Field } from "./Field.jsx";
import { Icon } from "./Icon.jsx";
import { IconButton } from "./IconButton.jsx";

/**
 * Single-line text input. Always labelled — a placeholder is not a label; it
 * disappears the moment someone starts typing and is skipped by most screen
 * readers.
 */
export function TextInput({
  id: providedId,
  label,
  hint,
  error,
  required,
  optional,
  icon,
  suffix,
  className,
  fieldClassName,
  ...rest
}) {
  const autoId = useId();
  const id = providedId ?? autoId;

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
          {icon && (
            <Icon
              name={icon}
              size={16}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-subtle"
            />
          )}
          <input
            id={id}
            required={required}
            aria-invalid={error ? "true" : undefined}
            aria-describedby={describedBy}
            className={cn(
              "nx-input",
              icon && "nx-input-with-icon",
              suffix && "pr-12",
              className
            )}
            {...rest}
          />
          {suffix && (
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[0.8125rem] text-ink-subtle">
              {suffix}
            </span>
          )}
        </div>
      )}
    </Field>
  );
}

/** Password input with a reveal toggle, so people can check what they typed. */
export function PasswordInput({
  id: providedId,
  label,
  hint,
  error,
  required,
  autoComplete = "current-password",
  className,
  fieldClassName,
  ...rest
}) {
  const autoId = useId();
  const id = providedId ?? autoId;
  const [visible, setVisible] = useState(false);

  return (
    <Field
      id={id}
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={fieldClassName}
    >
      {({ describedBy }) => (
        <div className="relative">
          <Icon
            name="lock"
            size={16}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-subtle"
          />
          <input
            id={id}
            type={visible ? "text" : "password"}
            required={required}
            autoComplete={autoComplete}
            aria-invalid={error ? "true" : undefined}
            aria-describedby={describedBy}
            className={cn("nx-input nx-input-with-icon pr-12", className)}
            {...rest}
          />
          {/* The toggle is wrapped rather than given `absolute` directly:
              IconButton owns a base `relative` (it anchors optional badges),
              and stacking `absolute` on the same element lets Tailwind's
              source order pick the winner — `relative` wins, the button drops
              into flow below the input, and every `top-1/2` icon then centers
              on the taller box. A positioned wrapper keeps the button in its
              own coordinate space. */}
          <span className="absolute top-1/2 right-1.5 -translate-y-1/2">
            <IconButton
              icon={visible ? "eye-off" : "eye"}
              label={visible ? "Hide password" : "Show password"}
              size="sm"
              onClick={() => setVisible((v) => !v)}
            />
          </span>
        </div>
      )}
    </Field>
  );
}

export default TextInput;
