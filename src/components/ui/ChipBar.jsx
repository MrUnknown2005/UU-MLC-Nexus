import { cn } from "../../lib/cn.js";

/**
 * A horizontally scrollable row of filter chips.
 *
 * Every list filter in the app — deadlines, account status, member role — is
 * the same shape: a handful of `.nx-chip` buttons that must stay readable and
 * tappable on a 320px phone. Left in a plain flex row the chips shrink to fit
 * and their labels overlap; this wrapper (see `.nx-chip-row`) lets the row
 * scroll sideways instead, with the scroll trapped here so the page never
 * moves. Owning it in one place is why all three pages behave identically.
 *
 * Pass the chips as children — they carry their own active state and counts.
 * `label` names the group for assistive tech, which a bare `<div>` never did.
 */
export function ChipBar({ label, className, children, ...rest }) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("nx-chip-row", className)}
      {...rest}
    >
      {children}
    </div>
  );
}

export default ChipBar;
