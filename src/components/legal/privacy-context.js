import { createContext, useContext } from "react";

/**
 * Privacy Policy context.
 *
 * Kept in its own `.js` module (mirroring `toast-context.js`) so
 * `PrivacyPolicyProvider.jsx` exports only a component and React Refresh stays
 * happy for the whole tree.
 *
 * @returns {{ openPrivacy: () => void }}
 */
export const PrivacyPolicyContext = createContext(null);

export function usePrivacyPolicy() {
  const value = useContext(PrivacyPolicyContext);

  if (!value) {
    throw new Error(
      "usePrivacyPolicy must be used inside <PrivacyPolicyProvider>"
    );
  }

  return value;
}
