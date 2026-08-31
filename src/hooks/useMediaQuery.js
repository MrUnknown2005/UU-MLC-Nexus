import { useCallback, useSyncExternalStore } from "react";

/**
 * Subscribe to a CSS media query.
 *
 *   const isDesktop = useMediaQuery("(min-width: 1024px)")
 *
 * Used for the one thing CSS cannot express: whether the sidebar should be a
 * persistent rail or an overlay sheet, which changes focus-trapping behaviour,
 * not just layout.
 */
export function useMediaQuery(query) {
  const subscribe = useCallback(
    (onChange) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    [query]
  );

  const getSnapshot = useCallback(
    () => window.matchMedia(query).matches,
    [query]
  );

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

export default useMediaQuery;
