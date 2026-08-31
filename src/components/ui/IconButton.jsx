import { cn } from "../../lib/cn.js";
import { Icon } from "./Icon.jsx";

const VARIANTS = {
  ghost: "text-ink-muted hover:text-ink hover:bg-hover",
  surface:
    "text-ink-muted bg-surface-2 border border-line hover:text-ink hover:border-brand-line",
  brand: "bg-brand text-brand-ink hover:bg-brand-hover",
  danger: "text-danger hover:bg-danger-soft",
};

const SIZES = {
  sm: "h-8 w-8 rounded-[8px]",
  md: "h-10 w-10 rounded-control",
  lg: "h-11 w-11 rounded-control",
};

const ICON_SIZES = { sm: 15, md: 18, lg: 19 };

/**
 * A control whose only content is an icon.
 *
 * `label` is required and becomes the accessible name — an icon-only button
 * with no label is invisible to a screen reader, which is how the old
 * notification bell and menu toggle shipped.
 */
export function IconButton({
  icon,
  label,
  variant = "ghost",
  size = "md",
  loading = false,
  disabled = false,
  className,
  children,
  type = "button",
  ...rest
}) {
  return (
    <button
      type={type}
      title={label}
      aria-label={label}
      disabled={disabled || loading}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center",
        "transition-[background-color,border-color,color] duration-150",
        "disabled:pointer-events-none disabled:opacity-50",
        SIZES[size],
        VARIANTS[variant],
        className
      )}
      {...rest}
    >
      <Icon
        name={loading ? "spinner" : icon}
        size={ICON_SIZES[size] ?? 18}
        className={loading ? "nx-spin" : undefined}
      />
      {/* Slot for a badge or status dot positioned by the caller. */}
      {children}
    </button>
  );
}

export default IconButton;
