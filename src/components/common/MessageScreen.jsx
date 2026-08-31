import { Button } from "../ui/Button.jsx";
import { Icon } from "../ui/Icon.jsx";
import { BrandMark } from "./Brand.jsx";
import { cn } from "../../lib/cn.js";

const TONES = {
  neutral: "bg-surface-3 text-ink-muted",
  brand: "bg-brand-soft text-brand-text",
  warn: "bg-warn-soft text-warn",
  danger: "bg-danger-soft text-danger",
};

/**
 * Full-screen terminal state — deactivated account, missing profile, load
 * failure.
 *
 * Every one of these used to be either an `alert()` or an unstyled div. They
 * are the screens a member sees on their worst day with this app, so each one
 * says what happened, whether their data is affected, and what to do next.
 */
export default function MessageScreen({
  icon = "info",
  tone = "neutral",
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
}) {
  return (
    <div className="nx-backdrop grid min-h-dvh place-items-center px-5 py-16">
      <div className="nx-panel w-full max-w-md p-7 text-center sm:p-9">
        <span
          className={cn(
            "mx-auto grid h-12 w-12 place-items-center rounded-full",
            TONES[tone] ?? TONES.neutral
          )}
        >
          <Icon name={icon} size={22} />
        </span>

        <h1 className="nx-display mt-5 text-xl">{title}</h1>

        {description && (
          <p className="mt-2.5 text-sm leading-relaxed text-ink-muted">
            {description}
          </p>
        )}

        {(actionLabel || secondaryLabel) && (
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {actionLabel && (
              <Button variant="primary" onClick={onAction}>
                {actionLabel}
              </Button>
            )}
            {secondaryLabel && (
              <Button variant="ghost" onClick={onSecondary}>
                {secondaryLabel}
              </Button>
            )}
          </div>
        )}

        <div className="mt-8 flex items-center justify-center gap-2 border-t border-line pt-5">
          <BrandMark size="sm" />
          <span className="nx-eyebrow">UU MLC Nexus</span>
        </div>
      </div>
    </div>
  );
}
