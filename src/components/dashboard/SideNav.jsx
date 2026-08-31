import { Avatar } from "../ui/Avatar.jsx";
import { Icon } from "../ui/Icon.jsx";
import { Brand } from "../common/Brand.jsx";
import { cn } from "../../lib/cn.js";
import { displayName, humanizeToken } from "../../lib/format.js";

/**
 * The navigation list itself, without any positioning.
 *
 * Rendered twice — inside the fixed desktop rail and inside the mobile sheet —
 * so the two can never drift apart. Each entry is a real `<button>` carrying
 * `aria-current="page"`, which is what the amber rail in `.nx-nav-item` hangs
 * off of.
 */
export function SideNavList({ items, tab, onSelect, badges }) {
  return (
    <nav aria-label="Sections" className="space-y-0.5">
      {items.map((item) => {
        const count = item.badge ? (badges[item.badge] ?? 0) : 0;
        const isCurrent = tab === item.id;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            aria-current={isCurrent ? "page" : undefined}
            className="nx-nav-item"
          >
            <Icon name={item.icon} size={17} className="shrink-0" />
            <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>

            {count > 0 && (
              <span
                className={cn(
                  "shrink-0 rounded-full px-1.5 py-0.5 text-[0.625rem] font-bold tabular-nums",
                  item.badge === "overdue"
                    ? "bg-danger-soft text-danger"
                    : "bg-brand-soft text-brand-text"
                )}
              >
                {count > 99 ? "99+" : count}
                <span className="sr-only"> needing attention</span>
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

/**
 * Fixed desktop rail: brand, navigation, and the member's own identity pinned
 * to the bottom where it doubles as a reminder of whose account this is.
 */
export function SideNav({ items, tab, onSelect, badges, profile, roleLabel }) {
  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto px-3 py-4">
      <div className="px-2 pt-1">
        <Brand size="sm" />
      </div>

      <div className="min-h-0 flex-1">
        <SideNavList
          items={items}
          tab={tab}
          onSelect={onSelect}
          badges={badges}
        />
      </div>

      <button
        type="button"
        onClick={() => onSelect("profile")}
        className="nx-well flex items-center gap-2.5 px-2.5 py-2.5 text-left transition-colors hover:border-brand-line"
      >
        <Avatar
          src={profile.avatar_url}
          name={displayName(profile)}
          seed={profile.id}
          size="sm"
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[0.8125rem] font-semibold text-ink">
            {displayName(profile)}
          </span>
          <span className="block truncate text-[0.6875rem] text-ink-subtle">
            {roleLabel ?? humanizeToken(profile.role)}
          </span>
        </span>
        <Icon name="chevron-right" size={14} className="shrink-0 text-ink-subtle" />
      </button>
    </div>
  );
}

export default SideNav;
