import { useEffect, useRef } from "react";

const TYPING_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

function isTyping(target) {
  if (!target) return false;
  if (TYPING_TAGS.has(target.tagName)) return true;
  return target.isContentEditable === true;
}

function parse(combo) {
  const parts = combo.toLowerCase().split("+").map((p) => p.trim());
  return {
    key: parts[parts.length - 1],
    mod: parts.includes("mod"),
    shift: parts.includes("shift"),
    alt: parts.includes("alt"),
  };
}

/**
 * Bind a keyboard shortcut for the lifetime of the component.
 *
 *   useHotkey("mod+k", open)     // ⌘K on macOS, Ctrl+K elsewhere
 *   useHotkey("escape", close)
 *   useHotkey("/", focusSearch)
 *
 * Shortcuts are suppressed while the member is typing, unless
 * `allowInInput` is set — Escape needs to work inside a form.
 */
export function useHotkey(combo, handler, options = {}) {
  const { enabled = true, allowInInput = false, preventDefault = true } = options;

  // Keeps the listener stable so a handler recreated each render does not churn
  // through add/removeEventListener on every keystroke elsewhere. The write
  // happens in an effect, never during render — effects flush before the next
  // user event, so the listener can never read a stale handler.
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!enabled) return undefined;

    const target = parse(combo);

    const onKeyDown = (event) => {
      if (event.key.toLowerCase() !== target.key) return;
      if (target.mod !== (event.metaKey || event.ctrlKey)) return;
      if (target.shift !== event.shiftKey) return;
      if (target.alt !== event.altKey) return;
      if (!allowInInput && isTyping(event.target)) return;

      if (preventDefault) event.preventDefault();
      handlerRef.current?.(event);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [combo, enabled, allowInInput, preventDefault]);
}

export default useHotkey;
