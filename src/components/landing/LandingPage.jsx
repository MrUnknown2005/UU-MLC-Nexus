import { Brand, BrandMark } from "../common/Brand.jsx";
import { Button } from "../ui/Button.jsx";
import { Icon } from "../ui/Icon.jsx";
import { ThemeToggle } from "../common/ThemeToggle.jsx";
import { usePrivacyPolicy } from "../legal/privacy-context.js";

/**
 * The signed-out front door.
 *
 * The old version was a wall of one-off effects — three animated orbit rings, a
 * noise overlay, two float-cards, and about a dozen hardcoded rgba values that
 * only ever worked in dark mode. All of it competed with the two things this
 * page is actually for: saying what Nexus is, and getting you to a form.
 *
 * So the hierarchy is now the hero, then the two buttons, then everything else.
 * The panel on the right is still there but quiet, built from the same tokens as
 * the rest of the product, and it simply does not render below `lg` — a phone
 * needs that vertical space for content, not decoration.
 */
const MODULES = [
  {
    code: "01",
    name: "Members",
    detail: "People, roles, presence",
    icon: "users",
  },
  {
    code: "02",
    name: "Points",
    detail: "Recognition, ranking, momentum",
    icon: "trophy",
  },
  {
    code: "03",
    name: "Workspace",
    detail: "Tasks, news, club activity",
    icon: "tasks",
  },
];

function LandingPage({ onLogin, onJoin }) {
  const { openPrivacy } = usePrivacyPolicy();

  return (
    <div className="nx-backdrop nx-safe-top nx-safe-bottom flex min-h-dvh flex-col">
      <div className="mx-auto flex w-full max-w-[var(--shell-max)] flex-1 flex-col px-4 py-5 sm:px-7 sm:py-7">
        <header className="flex items-center justify-between gap-3">
          <Brand size="md" subtitle="Uttara University" />

          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            {/* The header sign-in and the hero's secondary button are the same
                action on purpose: whichever one you reach for first, it works. */}
            <Button
              variant="ghost"
              size="sm"
              iconRight="arrow-right"
              onClick={onLogin}
            >
              <span className="hidden sm:inline">Member sign in</span>
              <span className="sm:hidden">Sign in</span>
            </Button>
          </div>
        </header>

        <main className="grid flex-1 items-center gap-14 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-20">
          <section className="min-w-0">
            <p className="nx-eyebrow inline-flex items-center gap-2 rounded-full border border-brand-line bg-brand-soft px-3 py-1.5 text-brand-text">
              <span className="nx-dot nx-dot-live text-success" />
              Nexus is live
            </p>

            <h1 className="nx-hero-type mt-7">
              The club,
              <br />
              <span className="nx-mark">in motion.</span>
            </h1>

            <p className="mt-7 max-w-xl text-base leading-relaxed text-ink-muted sm:text-lg">
              Nexus is the operating layer for UU MLC — a focused place where
              people, contribution, work and momentum meet.
            </p>

            <div className="mt-9 flex flex-wrap gap-2.5">
              <Button
                variant="primary"
                size="lg"
                iconRight="arrow-right"
                onClick={onJoin}
              >
                Enter Nexus
              </Button>
              <Button variant="secondary" size="lg" onClick={onLogin}>
                I already have an account
              </Button>
            </div>

            {/* Cards rather than a hairline grid of divs: the module list is
                content, and it has to survive a theme switch. */}
            <ul className="mt-14 grid max-w-2xl gap-3 sm:grid-cols-3">
              {MODULES.map((item) => (
                <li key={item.code} className="nx-card nx-lift p-4">
                  <div className="flex items-center justify-between">
                    <span className="nx-eyebrow nx-num">{item.code}</span>
                    <Icon
                      name={item.icon}
                      size={15}
                      className="text-brand-text"
                    />
                  </div>

                  <p className="nx-display mt-6 text-base">{item.name}</p>
                  <p className="mt-1 text-[0.75rem] leading-relaxed text-ink-subtle">
                    {item.detail}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          {/* Decorative, and honestly so: no information lives in here, which is
              exactly why it is allowed to vanish on a narrow screen. */}
          <section
            aria-hidden="true"
            className="relative hidden aspect-square w-full place-items-center lg:grid"
          >
            <span className="absolute h-full w-full rounded-full border border-line" />
            <span className="absolute h-[74%] w-[74%] rounded-full border border-line-strong" />
            <span className="absolute h-[48%] w-[48%] rounded-full border border-brand-line bg-brand-soft" />

            <span className="absolute top-[13%] h-2 w-2 rounded-full bg-brand" />
            <span className="absolute right-[13%] bottom-[26%] h-1.5 w-1.5 rounded-full bg-info" />
            <span className="absolute bottom-[13%] left-[22%] h-1.5 w-1.5 rounded-full bg-violet" />

            <div className="relative grid place-items-center">
              <BrandMark size="xl" className="shadow-brand" />
              <p className="nx-eyebrow mt-5 text-center">UU MLC / Nexus</p>
              <p className="mt-1.5 text-sm font-semibold text-ink-muted">
                Community operating system
              </p>
            </div>
          </section>
        </main>

        <footer className="nx-eyebrow flex flex-col justify-between gap-2 border-t border-line pt-5 sm:flex-row sm:items-center">
          <span>Uttara University · Machine Learning Club</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={openPrivacy}
              className="underline decoration-line-strong underline-offset-2 transition-colors hover:text-ink"
            >
              Privacy Policy
            </button>
            <span aria-hidden="true">·</span>
            <span>Learn · Build · Lead</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default LandingPage;
