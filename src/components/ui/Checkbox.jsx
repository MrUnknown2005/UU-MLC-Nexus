import { useId } from "react";
import { cn } from "../../lib/cn.js";
import { Icon } from "./Icon.jsx";

/**
 * Checkbox with a full-row hit target.
 *
 * The visible box is a styled span; the real input stays in the DOM (visually
 * hidden but focusable) so keyboard, form submission and screen readers all
 * behave natively.
 */
export function Checkbox({
  id: providedId,
  label,
  description,
  checked,
  disabled,
  className,
  ...rest
}) {
  const autoId = useId();
  const id = providedId ?? autoId;

  return (
    <div className={cn("flex items-start gap-2.5", className)}>
      <span className="relative mt-0.5 grid shrink-0 place-items-center">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
          {...rest}
        />
        <span
          aria-hidden="true"
          className={cn(
            "grid h-[1.125rem] w-[1.125rem] place-items-center rounded-[5px] border transition-colors",
            "border-line-strong bg-well text-transparent",
            "peer-checked:border-brand peer-checked:bg-brand peer-checked:text-brand-ink",
            "peer-focus-visible:ring-2 peer-focus-visible:ring-brand peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-canvas",
            "peer-disabled:opacity-50"
          )}
        >
          <Icon name="check" size={12} strokeWidth={3} />
        </span>
      </span>

      {(label || description) && (
        <label
          htmlFor={id}
          className={cn(
            "min-w-0 cursor-pointer text-[0.8125rem] leading-snug select-none",
            disabled && "cursor-not-allowed opacity-60"
          )}
        >
          <span className="font-medium text-ink">{label}</span>
          {description && (
            <span className="mt-0.5 block text-ink-muted">{description}</span>
          )}
        </label>
      )}
    </div>
  );
}

export default Checkbox;
