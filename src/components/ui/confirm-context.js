import { createContext, useContext } from "react";

/**
 * Confirm context — exposes a single async function.
 *
 *   const confirm = useConfirm()
 *   if (!(await confirm({ title: "Remove this member?" }))) return
 *
 * Options:
 *   title           required question
 *   description     what will actually happen
 *   tone            "default" | "danger"
 *   confirmLabel    defaults to "Confirm"
 *   cancelLabel     defaults to "Cancel"
 *   requireText     the member must type this exactly to enable the action
 *   consequences    array of strings rendered as a checklist of effects
 */
export const ConfirmContext = createContext(null);

export function useConfirm() {
  const confirm = useContext(ConfirmContext);

  if (!confirm) {
    throw new Error("useConfirm must be used inside <ConfirmProvider>");
  }

  return confirm;
}
