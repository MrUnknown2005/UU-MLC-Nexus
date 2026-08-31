import { useId } from "react";
import { cn } from "../../lib/cn.js";
import { Field } from "./Field.jsx";

/**
 * Native select. Deliberately native: it inherits the platform's keyboard
 * behaviour, works on touch without a custom sheet, and cannot trap focus.
 * Only the chevron is ours (see `.nx-select` in components.css).
 *
 * Pass either `options` (array of `{ value, label, disabled }` or strings) or
 * children for grouped markup.
 */
export function Select({
  id: providedId,
  label,
  hint,
  error,
  required,
  optional,
  options,
  placeholder,
  className,
  fieldClassName,
  children,
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
        <select
          id={id}
          required={required}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={describedBy}
          className={cn("nx-select", className)}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options?.map((option) => {
            const value = typeof option === "string" ? option : option.value;
            const text = typeof option === "string" ? option : option.label;
            return (
              <option
                key={value}
                value={value}
                disabled={typeof option === "object" && option.disabled}
              >
                {text}
              </option>
            );
          })}
          {children}
        </select>
      )}
    </Field>
  );
}

export default Select;
