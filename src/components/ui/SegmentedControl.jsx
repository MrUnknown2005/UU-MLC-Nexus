import { cn } from "../../lib/cn.js";
import { Icon } from "./Icon.jsx";

/**
 * Row of mutually exclusive options — the filter control for lists.
 *
 * Rendered as a real radio group so arrow keys move between options and the
 * selection is announced, which a row of buttons never is.
 */
export function SegmentedControl({
  name,
  value,
  onChange,
  options,
  label,
  size = "md",
  className,
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "inline-flex min-w-0 items-center gap-1 rounded-full border border-line bg-surface-2 p-1",
        className
      )}
    >
      {options.map((option) => {
        const optionValue = typeof option === "string" ? option : option.value;
        const optionLabel = typeof option === "string" ? option : option.label;
        const count = typeof option === "object" ? option.count : undefined;
        const icon = typeof option === "object" ? option.icon : undefined;
        const selected = optionValue === value;

        return (
          <label
            key={optionValue}
            className={cn(
              "relative inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full",
              "font-semibold whitespace-nowrap transition-colors select-none",
              size === "sm" ? "h-7 px-2.5 text-[0.75rem]" : "h-8 px-3 text-[0.8125rem]",
              selected
                ? "bg-brand text-brand-ink"
                : "text-ink-muted hover:bg-hover hover:text-ink",
              "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-canvas"
            )}
          >
            <input
              type="radio"
              name={name}
              value={optionValue}
              checked={selected}
              onChange={() => onChange(optionValue)}
              className="sr-only"
            />
            {icon && <Icon name={icon} size={13} strokeWidth={2} />}
            {optionLabel}
            {typeof count === "number" && (
              <span
                className={cn(
                  "tabular-nums",
                  selected ? "opacity-70" : "text-ink-subtle"
                )}
              >
                {count}
              </span>
            )}
          </label>
        );
      })}
    </div>
  );
}

export default SegmentedControl;
