import { useLayoutEffect, useRef } from "react";
import { useMediaQuery } from "./useMediaQuery.js";

/**
 * Slide-and-flash motion for the keyed, reorderable leaderboard.
 *
 * Because each row is keyed by member id, React keeps its DOM node across a
 * resort — so when points change and the list reorders we can play a FLIP:
 * measure where every row sits now (First/Last), transform it back to where it
 * sat last commit with no transition (Invert), then release the transform on
 * the next frame so it glides to its real position (Play).
 *
 * A row whose points changed also gets a one-shot amber wash (`.nx-flash`),
 * re-armed from JS because a CSS animation will not restart when the same class
 * merely stays applied. The wash is an inset box-shadow, so it never touches the
 * inline `transform` the slide is driving.
 *
 * Under reduced motion the hook does nothing: rows snap to their new order,
 * matching the global guard in base.css. It intentionally runs after every
 * commit (no dependency array) so it always compares against the freshest
 * layout; for a five-row board the measurement cost is nil.
 *
 * @param {{ id: string, value: number }[]} order Rows in current render order.
 * @returns {(id: string) => (el: HTMLElement | null) => void} A ref registrar;
 *   `registerRow(id)` returns a stable callback to spread onto that row's node.
 */
export function useRankFlip(order) {
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const nodes = useRef(new Map()); // id -> row element
  const callbacks = useRef(new Map()); // id -> stable ref callback
  const prevTops = useRef(new Map()); // id -> viewport top, last commit
  const prevValues = useRef(new Map()); // id -> points, last commit

  // One stable ref callback per id: a fresh callback each render would make
  // React detach and re-attach every row on every commit.
  const register = (id) => {
    let cb = callbacks.current.get(id);
    if (!cb) {
      cb = (el) => {
        if (el) nodes.current.set(id, el);
        else nodes.current.delete(id);
      };
      callbacks.current.set(id, cb);
    }
    return cb;
  };

  useLayoutEffect(() => {
    if (reduceMotion) return;

    // First/Last: where does every row sit now that React has committed?
    const newTops = new Map();
    nodes.current.forEach((el, id) => {
      newTops.set(id, el.getBoundingClientRect().top);
    });

    // Invert + Play: pin each moved row back to its old spot, then let go on
    // the next frame so it transitions to where it now belongs.
    newTops.forEach((newTop, id) => {
      const oldTop = prevTops.current.get(id);
      if (oldTop == null) return;
      const delta = oldTop - newTop;
      if (!delta) return;

      const el = nodes.current.get(id);
      el.style.transition = "none";
      el.style.transform = `translateY(${delta}px)`;
      el.getBoundingClientRect(); // flush the inverted start before playing
      requestAnimationFrame(() => {
        el.style.transition = "transform var(--t-slow) var(--ease)";
        el.style.transform = "";
      });
    });

    // Flash the rows whose points changed — never on the first commit, when
    // there is no previous value to compare against.
    order.forEach(({ id, value }) => {
      const prev = prevValues.current.get(id);
      if (prev == null || prev === value) return;
      const el = nodes.current.get(id);
      if (!el) return;
      el.classList.remove("nx-flash");
      // Reading a layout property forces the reflow that lets the one-shot
      // animation re-arm; using the value keeps the class add unconditional
      // for any on-screen row.
      if (el.offsetWidth >= 0) el.classList.add("nx-flash");
    });

    prevTops.current = newTops;
    prevValues.current = new Map(order.map(({ id, value }) => [id, value]));
  });

  return register;
}

export default useRankFlip;
