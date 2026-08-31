import { useMemo, useState } from "react";
import { Button } from "../ui/Button.jsx";
import { Modal } from "../ui/Modal.jsx";
import { PrivacyPolicyContext } from "./privacy-context.js";
import PrivacyContent from "./privacyContent.jsx";

/**
 * Makes the Privacy Policy openable from anywhere under `<App/>`.
 *
 * There is no bespoke overlay here: the policy renders inside the shared
 * `Modal`, which already portals to <body>, traps focus, locks body scroll,
 * and dismisses on Escape or a backdrop press. The context exposes a single
 * `openPrivacy()` so a footer link or the sign-up consent line can summon it.
 */
export function PrivacyPolicyProvider({ children }) {
  const [open, setOpen] = useState(false);

  // Stable identity so consumers don't re-render when the policy opens/closes.
  const value = useMemo(() => ({ openPrivacy: () => setOpen(true) }), []);

  return (
    <PrivacyPolicyContext.Provider value={value}>
      {children}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Privacy Policy"
        size="xl"
        footer={
          <Button variant="primary" onClick={() => setOpen(false)}>
            Close
          </Button>
        }
      >
        <PrivacyContent />
      </Modal>
    </PrivacyPolicyContext.Provider>
  );
}

export default PrivacyPolicyProvider;
