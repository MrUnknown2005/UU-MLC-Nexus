import { useSyncExternalStore } from "react";
import {
  cycleTheme,
  getResolvedTheme,
  getTheme,
  setTheme,
  subscribeToTheme,
} from "../lib/theme.js";

/**
 * Read and change the colour theme.
 *
 * `useSyncExternalStore` rather than context: the store lives outside React so
 * the pre-paint script in index.html and the toggle in the top bar are reading
 * the same value, and no provider has to wrap the tree.
 */
export function useTheme() {
  const theme = useSyncExternalStore(subscribeToTheme, getTheme, () => "system");
  const resolved = useSyncExternalStore(
    subscribeToTheme,
    getResolvedTheme,
    () => "dark"
  );

  return { theme, resolved, setTheme, cycleTheme };
}

export default useTheme;
