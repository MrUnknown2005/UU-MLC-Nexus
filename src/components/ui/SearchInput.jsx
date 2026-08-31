import { useId, useRef } from "react";
import { cn } from "../../lib/cn.js";
import { Icon } from "./Icon.jsx";
import { useHotkey } from "../../hooks/useHotkey.js";

/**
 * Search box for filtering a list in place.
 *
 * `onChange` receives the string, not the event — every caller wants the value
 * and `event.target.value` at eight call sites is eight chances to typo it.
 *
 * `/` focuses it from anywhere on the page (suppressed while typing), and a
 * clear button appears once there is a value — with a live region announcing
 * the result count so a filter that empties a list is not silent.
 */
export function SearchInput({
  value,
  onChange,
  onClear,
  placeholder = "Search…",
  label = "Search",
  resultCount,
  hotkey = true,
  className,
  ...rest
}) {
  const id = useId();
  const inputRef = useRef(null);

  useHotkey("/", () => inputRef.current?.focus(), { enabled: hotkey });

  const clear = () => {
    onClear?.();
    onChange?.("");
    inputRef.current?.focus();
  };

  return (
    <div className={cn("relative min-w-0", className)}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>

      <Icon
        name="search"
        size={16}
        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-subtle"
      />

      <input
        id={id}
        ref={inputRef}
        type="search"
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="nx-input nx-input-with-icon pr-10"
        {...rest}
      />

      {value ? (
        <button
          type="button"
          onClick={clear}
          aria-label="Clear search"
          className="absolute top-1/2 right-2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-[7px] text-ink-subtle transition-colors hover:bg-hover hover:text-ink"
        >
          <Icon name="close" size={14} />
        </button>
      ) : (
        hotkey && (
          <kbd
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 rounded-[5px] border border-line px-1.5 py-0.5 font-mono text-[0.625rem] text-ink-subtle"
          >
            /
          </kbd>
        )
      )}

      {typeof resultCount === "number" && (
        <p aria-live="polite" className="sr-only">
          {resultCount} result{resultCount === 1 ? "" : "s"}
        </p>
      )}
    </div>
  );
}

export default SearchInput;
