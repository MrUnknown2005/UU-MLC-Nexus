import { useEffect } from "react";

// Nested surfaces (a confirm dialog opened from inside a sheet) must not let
// the inner one unlock scrolling when it closes.
let lockCount = 0;
let restoreOverflow = "";

/** Freeze background scrolling while a dialog, sheet or palette is open. */
export function useLockBodyScroll(active) {
  useEffect(() => {
    if (!active) return undefined;

    if (lockCount === 0) {
      restoreOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    lockCount += 1;

    return () => {
      lockCount -= 1;
      if (lockCount === 0) {
        document.body.style.overflow = restoreOverflow;
      }
    };
  }, [active]);
}

export default useLockBodyScroll;
