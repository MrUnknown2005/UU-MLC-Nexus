import { useSyncExternalStore } from "react";

/**
 * The current time, as a value the render is allowed to read.
 *
 * Two reasons this is not just `Date.now()` in the component body. It is impure
 * — two renders in the same commit could disagree — and React's compiler rules
 * reject it outright. And a relative timestamp that is computed once is wrong a
 * minute later: "2 minutes ago" stays "2 minutes ago" until something unrelated
 * happens to re-render it.
 *
 * One interval is shared by every consumer and only runs while at least one
 * component is mounted, so a page with forty timestamps still ticks once.
 */
const listeners = new Set();

let current = Date.now();
let timer = null;

function tick() {
  current = Date.now();
  for (const listener of listeners) listener();
}

function subscribe(listener) {
  listeners.add(listener);

  if (timer === null) {
    tick();
    timer = setInterval(tick, 30_000);
  }

  return () => {
    listeners.delete(listener);

    if (listeners.size === 0 && timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };
}

/** Cached, so React sees a stable snapshot instead of a new value per call. */
function getSnapshot() {
  return current;
}

export function useNow() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export default useNow;
