import { cn } from "../../lib/cn.js";

/**
 * The heading block at the top of every tab.
 *
 * Consistent placement matters more than decoration here: members learn one
 * spot for "where am I" and one spot for "what can I do".
 */
export function PageHeader({ eyebrow, title, description, actions, className }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-x-6 gap-y-4",
        className
      )}
    >
      <div className="min-w-0 max-w-2xl">
        {eyebrow && <p className="nx-eyebrow mb-2">{eyebrow}</p>}
        <h1 className="nx-display text-2xl sm:text-[1.75rem]">{title}</h1>
        {description && (
          <p className="mt-2 text-sm text-ink-muted">{description}</p>
        )}
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}

export default PageHeader;
