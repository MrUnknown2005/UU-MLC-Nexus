import { useEffect } from "react";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function focusableWithin(container) {
  if (!container) return [];
  return Array.from(container.querySelectorAll(FOCUSABLE)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement
  );
}

/**
 * Keep keyboard focus inside a dialog while it is open, then hand it back to
 * whatever opened it.
 *
 * Without this a screen-reader or keyboard user tabs straight out of a modal
 * into the page behind it — the single most common accessibility failure in
 * hand-rolled dialogs, and one this app previously had everywhere.
 */
export function useFocusTrap(containerRef, active) {
  useEffect(() => {
    if (!active) return undefined;

    const container = containerRef.current;
    if (!container) return undefined;

    const previouslyFocused = document.activeElement;

    // Prefer an element the author marked, then the first natural stop, then
    // the container itself so focus never sits on <body>.
    const initial =
      container.querySelector("[data-autofocus]") ??
      focusableWithin(container)[0] ??
      container;
    initial.focus?.({ preventScroll: true });

    const onKeyDown = (event) => {
      if (event.key !== "Tab") return;

      const stops = focusableWithin(container);
      if (stops.length === 0) {
        event.preventDefault();
        return;
      }

      const first = stops[0];
      const last = stops[stops.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    // Focus can also be stolen programmatically; pull it back in.
    const onFocusIn = (event) => {
      if (!container.contains(event.target)) {
        (focusableWithin(container)[0] ?? container).focus?.({
          preventScroll: true,
        });
      }
    };

    container.addEventListener("keydown", onKeyDown);
    document.addEventListener("focusin", onFocusIn);

    return () => {
      container.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("focusin", onFocusIn);
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [containerRef, active]);
}

export default useFocusTrap;
