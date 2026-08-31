import { cn } from "../../lib/cn.js";
import { Icon } from "./Icon.jsx";

const VARIANTS = {
  primary:
    "bg-brand text-brand-ink font-semibold hover:bg-brand-hover active:bg-brand-press shadow-brand",
  secondary:
    "bg-surface-2 text-ink border border-line-strong hover:bg-surface-3 hover:border-brand-line",
  ghost: "text-ink-muted hover:text-ink hover:bg-hover",
  outline:
    "border border-line-strong text-ink hover:border-brand-line hover:bg-hover",
  danger:
    "bg-danger text-white font-semibold hover:brightness-110 active:brightness-95",
  "danger-soft":
    "bg-danger-soft text-danger border border-danger-line hover:bg-danger hover:text-white",
  "success-soft":
    "bg-success-soft text-success border border-success-line hover:bg-success hover:text-white",
};

const SIZES = {
  xs: "h-7 px-2 text-xs gap-1 rounded-[8px]",
  sm: "h-9 px-3 text-[0.8125rem] gap-1.5 rounded-control",
  md: "h-11 px-4 text-sm gap-2 rounded-control",
  lg: "h-12 px-5 text-[0.9375rem] gap-2 rounded-control",
};

const ICON_SIZES = { xs: 13, sm: 15, md: 17, lg: 18 };

/**
 * The one button in the product.
 *
 * `as="span"` lets it sit inside a `<label>` that wraps a hidden file input —
 * the only way to style a file picker without a nested-interactive violation.
 */
export function Button({
  variant = "secondary",
  size = "md",
  icon,
  iconRight,
  loading = false,
  disabled = false,
  fullWidth = false,
  as: Tag = "button",
  className,
  children,
  type,
  ...rest
}) {
  const isDisabled = disabled || loading;
  const glyph = ICON_SIZES[size] ?? 17;

  return (
    <Tag
      type={Tag === "button" ? (type ?? "button") : type}
      disabled={Tag === "button" ? isDisabled : undefined}
      aria-disabled={Tag === "button" ? undefined : isDisabled || undefined}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex shrink-0 items-center justify-center whitespace-nowrap",
        "transition-[background-color,border-color,color,box-shadow,transform] duration-150",
        "active:translate-y-px",
        "disabled:pointer-events-none disabled:opacity-50",
        "aria-disabled:pointer-events-none aria-disabled:opacity-50",
        SIZES[size],
        VARIANTS[variant],
        fullWidth && "w-full",
        className
      )}
      {...rest}
    >
      {loading ? (
        <Icon name="spinner" size={glyph} className="nx-spin" />
      ) : (
        icon && <Icon name={icon} size={glyph} />
      )}
      {children}
      {iconRight && !loading && <Icon name={iconRight} size={glyph} />}
    </Tag>
  );
}

export default Button;
