import { useEffect, useRef } from "react";

/**
 * Call `handler` when a pointer press starts outside every referenced element.
 *
 * `pointerdown` rather than `click`: a menu that closes on click stays open for
 * a whole press-drag-release, and a click that started inside and ended outside
 * would close it unexpectedly.
 *
 *   const panel = useRef(null)
 *   const trigger = useRef(null)
 *   useOnClickOutside([panel, trigger], close, isOpen)
 *
 * Passing the trigger too is what stops the "close then immediately reopen"
 * flicker when the trigger is a toggle.
 */
export function useOnClickOutside(refs, handler, enabled = true) {
  // Both the ref list and the handler are almost always fresh literals, so they
  // are read through a box that an effect keeps current. That leaves the real
  // listener effect depending on `enabled` alone — one subscribe per open,
  // not one per render — with no ref written during render.
  const latest = useRef({ refs, handler });

  useEffect(() => {
    latest.current = { refs, handler };
  }, [refs, handler]);

  useEffect(() => {
    if (!enabled) return undefined;

    const onPointerDown = (event) => {
      const { refs: targets, handler: onOutside } = latest.current;
      const list = Array.isArray(targets) ? targets : [targets];

      const inside = list.some((ref) => ref?.current?.contains(event.target));
      if (!inside) onOutside?.(event);
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    return () =>
      document.removeEventListener("pointerdown", onPointerDown, true);
  }, [enabled]);
}

export default useOnClickOutside;
