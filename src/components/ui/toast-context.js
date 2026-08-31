import { createContext, useContext } from "react";

/**
 * Toast context.
 *
 * Kept in its own module (and its own `.js` file) so ToastProvider.jsx exports
 * only a component — otherwise every provider edit invalidates React Refresh
 * for the whole tree.
 */
export const ToastContext = createContext(null);

/**
 * `options` accepts `{ description, action: { label, onClick }, duration }`.
 * Pass `duration: Infinity` for a toast that only leaves when dismissed.
 *
 * @returns {{
 *   toast: {
 *     show: (message: string, options?: object) => string,
 *     success: (message: string, options?: object) => string,
 *     error: (message: string, options?: object) => string,
 *     warn: (message: string, options?: object) => string,
 *     info: (message: string, options?: object) => string,
 *   },
 *   dismiss: (id: string) => void,
 * }}
 */
export function useToast() {
  const value = useContext(ToastContext);

  if (!value) {
    throw new Error("useToast must be used inside <ToastProvider>");
  }

  return value;
}
