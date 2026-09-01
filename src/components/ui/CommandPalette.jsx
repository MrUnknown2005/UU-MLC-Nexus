import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/cn.js";
import { Icon } from "./Icon.jsx";
import { useLockBodyScroll } from "../../hooks/useLockBodyScroll.js";

function score(item, query) {
  if (!query) return 0;

  const haystack = `${item.label} ${item.keywords ?? ""} ${item.group ?? ""}`
    .toLowerCase();
  const needle = query.toLowerCase();

  const index = haystack.indexOf(needle);
  if (index === -1) return -1;

  // A prefix match on the label itself beats a match buried in keywords.
  return item.label.toLowerCase().startsWith(needle) ? 2 : index === 0 ? 1 : 0;
}

/**
 * Command palette (⌘K / Ctrl+K).
 *
 * Nine tabs plus a dozen actions is more than a sidebar can surface at once.
 * This gives every destination and every safe action one keystroke away, and
 * doubles as a discovery surface — members find pages they never clicked into.
 *
 * `groups` is `[{ label, items: [{ id, label, icon, hint, keywords, run }] }]`.
 *
 * The dialog is a separate component so closing genuinely unmounts it: query
 * and cursor reset because they cease to exist, not because an effect chases
 * the `open` prop back to its initial value.
 */
export function CommandPalette({ open, onClose, groups = [] }) {
  if (!open) return null;
  return <Palette onClose={onClose} groups={groups} />;
}

function Palette({ onClose, groups }) {
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const listRef = useRef(null);
  const listId = useId();

  useLockBodyScroll(true);

  const flat = useMemo(() => {
    const items = groups.flatMap((group) =>
      group.items.map((item) => ({ ...item, group: group.label }))
    );

    if (!query.trim()) return items;

    return items
      .map((item) => ({ item, rank: score(item, query.trim()) }))
      .filter((entry) => entry.rank >= 0)
      .sort((a, b) => b.rank - a.rank)
      .map((entry) => entry.item);
  }, [groups, query]);

  // Clamped at read time rather than corrected by an effect: filtering can drop
  // the list out from under the cursor between one keystroke and the next, and
  // an effect would render one frame with nothing highlighted first.
  const active = flat.length ? Math.min(cursor, flat.length - 1) : -1;
  const activeItem = flat[active];

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        setCursor(flat.length ? (active + 1) % flat.length : 0);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setCursor(flat.length ? (active - 1 + flat.length) % flat.length : 0);
      } else if (event.key === "Enter") {
        event.preventDefault();
        if (activeItem) {
          onClose();
          activeItem.run?.();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [flat.length, active, activeItem, onClose]);

  // Keep the highlighted row inside the scroll viewport.
  useEffect(() => {
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[12vh]">
      <div
        aria-hidden="true"
        onClick={onClose}
        className="nx-fade absolute inset-0 bg-black/65 backdrop-blur-[2px]"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="nx-toast-in relative flex max-h-[70dvh] w-full max-w-lg flex-col overflow-hidden rounded-panel border border-line-strong bg-surface shadow-pop"
      >
        <div className="flex items-center gap-2.5 border-b border-line px-4">
          <Icon name="search" size={17} className="shrink-0 text-ink-subtle" />
          <input
            // Safe here in a way it rarely is: this input is the only reason the
            // dialog exists, and the dialog only mounts on a deliberate ⌘K.
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Jump to a page or run an action…"
            aria-label="Search commands"
            aria-controls={listId}
            aria-activedescendant={
              activeItem ? `${listId}-${activeItem.id}` : undefined
            }
            autoComplete="off"
            spellCheck={false}
            className="h-13 w-full bg-transparent py-3.5 text-base outline-none placeholder:text-ink-subtle sm:text-sm"
          />
          <kbd className="shrink-0 rounded-[5px] border border-line px-1.5 py-0.5 font-mono text-[0.625rem] text-ink-subtle">
            esc
          </kbd>
        </div>

        <div ref={listRef} className="nx-scroll-y min-h-0 flex-1 p-2">
          {flat.length === 0 ? (
            <p className="px-3 py-8 text-center text-[0.8125rem] text-ink-muted">
              Nothing matches “{query}”.
            </p>
          ) : (
            <ul id={listId} role="listbox" aria-label="Commands">
              {groups.map((group) => {
                const items = flat.filter((item) => item.group === group.label);
                if (items.length === 0) return null;

                return (
                  <li key={group.label} className="mb-1 last:mb-0">
                    <p className="nx-eyebrow px-2.5 pt-2 pb-1.5">{group.label}</p>
                    <ul>
                      {items.map((item) => {
                        // Index into `flat`, not into this group — a query
                        // re-ranks across groups, so a running counter would
                        // desynchronise the keyboard cursor from what is lit.
                        const index = flat.indexOf(item);
                        const isActive = index === active;

                        return (
                          <li key={item.id}>
                            <button
                              type="button"
                              id={`${listId}-${item.id}`}
                              role="option"
                              aria-selected={isActive}
                              data-active={isActive}
                              onMouseMove={() => setCursor(index)}
                              onClick={() => {
                                onClose();
                                item.run?.();
                              }}
                              className={cn(
                                "flex w-full items-center gap-2.5 rounded-control px-2.5 py-2 text-left transition-colors",
                                isActive ? "bg-brand-soft text-ink" : "text-ink-muted"
                              )}
                            >
                              <span
                                className={cn(
                                  "grid h-7 w-7 shrink-0 place-items-center rounded-[8px]",
                                  isActive
                                    ? "bg-brand text-brand-ink"
                                    : "bg-surface-2 text-ink-subtle"
                                )}
                              >
                                <Icon name={item.icon ?? "arrow-right"} size={14} />
                              </span>

                              <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-medium text-ink">
                                {item.label}
                              </span>

                              {item.hint && (
                                <span className="shrink-0 text-[0.6875rem] text-ink-subtle">
                                  {item.hint}
                                </span>
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center gap-4 border-t border-line px-4 py-2.5 text-[0.6875rem] text-ink-subtle">
          <span className="flex items-center gap-1.5">
            <Icon name="chevrons-up-down" size={12} />
            navigate
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="rounded-[4px] border border-line px-1 font-mono">
              ↵
            </kbd>
            run
          </span>
          <span className="ml-auto tabular-nums">
            {flat.length} {flat.length === 1 ? "command" : "commands"}
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default CommandPalette;
