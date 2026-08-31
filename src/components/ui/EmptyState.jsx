import { cn } from "../../lib/cn.js";
import { Icon } from "./Icon.jsx";

/**
 * What a list looks like when it has nothing in it.
 *
 * Every empty state says what would be here and, where the member can act,
 * gives them the action. "No data" on its own is a dead end.
 */
export function EmptyState({
  icon = "inbox",
  title,
  description,
  action,
  compact = false,
  className,
}) {
  return (
    <div
      className={cn(
        "nx-dashed flex flex-col items-center justify-center text-center",
        compact ? "gap-2 px-4 py-8" : "gap-3 px-6 py-14",
        className
      )}
    >
      <span
        className={cn(
          "grid place-items-center rounded-full bg-surface-2 text-ink-subtle",
          compact ? "h-9 w-9" : "h-12 w-12"
        )}
      >
        <Icon name={icon} size={compact ? 17 : 21} />
      </span>

      <div className="max-w-sm">
        <p
          className={cn(
            "font-display font-semibold tracking-tight text-ink",
            compact ? "text-sm" : "text-base"
          )}
        >
          {title}
        </p>
        {description && (
          <p className="mt-1 text-[0.8125rem] text-ink-muted">{description}</p>
        )}
      </div>

      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

export default EmptyState;
