import { cn } from "../../lib/cn.js";
import { Icon } from "./Icon.jsx";

const TONES = {
  neutral: "bg-surface-3 text-ink-muted border-line",
  brand: "bg-brand-soft text-brand-text border-brand-line",
  success: "bg-success-soft text-success border-success-line",
  danger: "bg-danger-soft text-danger border-danger-line",
  warn: "bg-warn-soft text-warn border-warn-line",
  info: "bg-info-soft text-info border-info-line",
  violet: "bg-violet-soft text-violet border-violet-line",
  solid: "bg-brand text-brand-ink border-brand",
};

const SIZES = {
  sm: "h-5 px-1.5 text-[0.6875rem] gap-1",
  md: "h-6 px-2 text-xs gap-1",
};

/** Small status pill. Reads as text, so no aria needed. */
export function Badge({
  tone = "neutral",
  size = "md",
  icon,
  dot = false,
  className,
  children,
  ...rest
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-semibold",
        "whitespace-nowrap tracking-tight",
        SIZES[size],
        TONES[tone],
        className
      )}
      {...rest}
    >
      {dot && <span className="nx-dot" />}
      {icon && <Icon name={icon} size={size === "sm" ? 11 : 12} strokeWidth={2} />}
      {children}
    </span>
  );
}

export default Badge;
