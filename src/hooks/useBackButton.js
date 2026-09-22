import { useEffect, useRef } from "react";
import { registerBackHandler } from "../lib/backButton";

/**
 * Subscribe a component to the Android back button for its lifetime.
 *
 * `handler` returns true when it consumed the press (see lib/backButton.js). It
 * is held in a ref and always called in its latest form, so callers don't need
 * a dependency array or worry about stale closures; registration itself only
 * re-runs if `priority` changes.
 */
export function useBackButton(handler, priority = 0) {
  const handlerRef = useRef(handler);

  // Keep the ref pointing at the latest handler. Done in an effect (not during
  // render) so the latest closure is always called without a stale-closure bug.
  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    return registerBackHandler(() => handlerRef.current(), priority);
  }, [priority]);
}

export default useBackButton;
