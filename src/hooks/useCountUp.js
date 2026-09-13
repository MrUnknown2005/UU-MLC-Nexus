import { useEffect, useRef, useState } from "react";
import { useMediaQuery } from "./useMediaQuery.js";

/**
 * Count a number up to its target on an ease-out curve.
 *
 * Mounts from 0, and on later target changes animates from wherever the last
 * run left off — never from a stale snapshot — so a figure that changes
 * mid-flight keeps moving smoothly instead of snapping backwards.
 *
 * Respects reduced-motion: the display is pinned to the target with no rAF
 * loop, mirroring the CSS animations that jump to their final frame.
 *
 * Pass `animateOnMount: false` to start already settled on the first target and
 * animate only later changes — for a figure that should read as calm on load
 * and move only when something genuinely changes (e.g. a live leaderboard).
 */
export function useCountUp(target, { duration = 850, animateOnMount = true } = {}) {
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const safeTarget = Number.isFinite(target) ? target : 0;

  // Start at the target (no count-up) when motion is off or the caller opted
  // out of the mount animation; otherwise sweep up from zero.
  const settleAtStart = reduceMotion || !animateOnMount;
  const [display, setDisplay] = useState(settleAtStart ? safeTarget : 0);
  const valueRef = useRef(settleAtStart ? safeTarget : 0);

  useEffect(() => {
    if (reduceMotion) {
      setDisplay(safeTarget);
      valueRef.current = safeTarget;
      return;
    }

    const from = valueRef.current;
    const delta = safeTarget - from;
    if (delta === 0) return;

    const start = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      const next = from + delta * eased;

      valueRef.current = next;
      setDisplay(next);

      if (t < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        valueRef.current = safeTarget;
        setDisplay(safeTarget);
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [safeTarget, duration, reduceMotion]);

  return display;
}

export default useCountUp;
