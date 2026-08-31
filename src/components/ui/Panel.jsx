import { cn } from "../../lib/cn.js";
import { Icon } from "./Icon.jsx";

const PADS = {
  none: "",
  sm: "p-3 sm:p-4",
  md: "p-4 sm:p-5",
  lg: "p-5 sm:p-7",
};

/**
 * The container every block of content sits in.
 *
 * Pass `title` for the common case and the header is built for you; pass
 * children only for a bare surface. `actions` sits opposite the title and wraps
 * below it on narrow screens rather than squeezing the heading.
 */
export function Panel({
  as: Tag = "section",
  eyebrow,
  title,
  description,
  icon,
  actions,
  footer,
  pad = "md",
  bare = false,
  className,
  bodyClassName,
  children,
  ...rest
}) {
  const hasHeader = Boolean(eyebrow || title || description || actions);

  return (
    <Tag
      className={cn(
        bare ? "rounded-panel" : "nx-panel",
        "flex min-w-0 flex-col",
        className
      )}
      {...rest}
    >
      {hasHeader && (
        <header
          className={cn(
            "flex flex-wrap items-start justify-between gap-3",
            "border-b border-line px-4 py-3.5 sm:px-5"
          )}
        >
          <div className="flex min-w-0 items-start gap-3">
            {icon && (
              <span
                className={cn(
                  "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-[9px]",
                  "bg-brand-soft text-brand-text"
                )}
              >
                <Icon name={icon} size={16} />
              </span>
            )}
            <div className="min-w-0">
              {eyebrow && <p className="nx-eyebrow mb-1">{eyebrow}</p>}
              {title && (
                <h2 className="text-[0.9375rem] leading-tight font-semibold">
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-1 text-[0.8125rem] text-ink-muted">
                  {description}
                </p>
              )}
            </div>
          </div>

          {actions && (
            <div className="flex flex-wrap items-center gap-2">{actions}</div>
          )}
        </header>
      )}

      <div className={cn("min-w-0 flex-1", PADS[pad], bodyClassName)}>
        {children}
      </div>

      {footer && (
        <footer className="border-t border-line px-4 py-3 sm:px-5">
          {footer}
        </footer>
      )}
    </Tag>
  );
}

/** Full-bleed divider inside a Panel body that uses `pad="none"`. */
export function PanelDivider({ className }) {
  return <div className={cn("h-px w-full bg-line", className)} />;
}

export default Panel;
