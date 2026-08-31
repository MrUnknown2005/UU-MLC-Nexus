import { BrandMark } from "./Brand.jsx";

/**
 * First paint while the session is being resolved.
 *
 * Deliberately not a spinner on an empty page: it renders the brand and the
 * *shape* of the dashboard, so the wait reads as "loading your workspace"
 * rather than "nothing happened". Roughly 300ms on a warm session — long
 * enough that a bare "Loading..." felt like a stall.
 */
export default function BootScreen() {
  return (
    <div
      className="nx-backdrop grid min-h-dvh place-items-center px-5"
      role="status"
      aria-busy="true"
    >
      <div className="w-full max-w-xs text-center">
        <BrandMark size="lg" className="mx-auto" />

        <p className="nx-display mt-4 text-lg">
          UU MLC <span className="text-brand-text">Nexus</span>
        </p>
        <p className="mt-1 text-[0.8125rem] text-ink-muted">
          Opening your workspace…
        </p>

        <div className="mt-6 space-y-2" aria-hidden="true">
          <div className="nx-skeleton h-2.5 w-full rounded-full" />
          <div className="nx-skeleton h-2.5 w-4/5 rounded-full" />
          <div className="nx-skeleton h-2.5 w-2/3 rounded-full" />
        </div>
      </div>
    </div>
  );
}
