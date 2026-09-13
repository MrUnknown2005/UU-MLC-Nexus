import { cn } from "../../lib/cn.js";

/**
 * The moment a list is genuinely, completely done.
 *
 * An amber ring bursts out from behind a check that draws itself on, then the
 * whole thing settles into a calm "all clear" resting state. It plays once, on
 * mount — so it fires when the last task is cleared, not on every re-render.
 *
 * Under reduced-motion the rings and the draw collapse to their final frame
 * (rings faded out, check already drawn) through the global guard in base.css:
 * the badge is simply there, complete, with no movement.
 */
export function Celebration({ title, description, className }) {
  return (
    <div
      className={cn(
        "nx-dashed nx-rise flex flex-col items-center justify-center gap-4 px-6 py-14 text-center",
        className
      )}
    >
      <span className="relative grid h-16 w-16 place-items-center">
        <span aria-hidden="true" className="nx-celebrate-ring" />
        <span
          aria-hidden="true"
          className="nx-celebrate-ring nx-celebrate-ring-2"
        />
        <span className="nx-celebrate-badge relative grid h-12 w-12 place-items-center rounded-full bg-brand text-brand-ink shadow-brand">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path className="nx-celebrate-check" d="M20 6 9 17l-5-5" />
          </svg>
        </span>
      </span>

      <div>
        <p className="nx-display text-lg text-ink">{title}</p>
        {description && (
          <p className="mt-1.5 max-w-xs text-[0.8125rem] text-ink-muted">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

export default Celebration;
