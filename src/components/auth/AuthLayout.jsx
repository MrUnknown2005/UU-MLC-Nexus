import { Icon } from "../ui/Icon.jsx";
import { Brand, BrandMark } from "../common/Brand.jsx";
import { Button } from "../ui/Button.jsx";
import { ThemeToggle } from "../common/ThemeToggle.jsx";

const HIGHLIGHTS = [
  {
    icon: "trophy",
    title: "Points and standings",
    body: "Every award is logged with a reason, so the leaderboard is something you can argue with.",
  },
  {
    icon: "tasks",
    title: "Shared task board",
    body: "Deadlines, assignees and attachments in one place instead of three group chats.",
  },
  {
    icon: "newspaper",
    title: "Announcements that stick",
    body: "Club news lands here first and stays readable a month later.",
  },
];

/**
 * Two-pane frame shared by sign-in, sign-up and password reset.
 *
 * The left pane is decorative on desktop and simply absent below `lg` — a
 * phone gets the form and nothing competing with it. The form pane owns the
 * page's single `<h1>`.
 */
export default function AuthLayout({
  title,
  subtitle,
  children,
  footer,
  onBack,
}) {
  return (
    <div className="nx-safe-top nx-safe-bottom grid min-h-dvh lg:grid-cols-[1fr_minmax(0,30rem)]">
      <aside className="nx-backdrop relative hidden flex-col justify-between overflow-hidden border-r border-line p-10 lg:flex xl:p-14">
        <Brand size="md" />

        <div className="relative max-w-md">
          <p className="nx-eyebrow">United University Machine Learning Club</p>

          <h2 className="nx-display mt-3 text-[2.5rem] leading-[1.05] xl:text-[3rem]">
            The club, <span className="text-brand-text">organised.</span>
          </h2>

          <ul className="mt-9 space-y-6">
            {HIGHLIGHTS.map((item) => (
              <li key={item.title} className="flex gap-3.5">
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-brand-soft text-brand-text ring-1 ring-brand-line">
                  <Icon name={item.icon} size={17} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{item.title}</p>
                  <p className="mt-1 text-[0.8125rem] leading-relaxed text-ink-muted">
                    {item.body}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-[0.6875rem] text-ink-subtle">
          Members only. Accounts are approved by club administrators.
        </p>
      </aside>

      <main className="relative flex flex-col justify-center bg-canvas px-5 py-10 sm:px-10">
        <div className="absolute top-4 right-4 flex items-center gap-1.5 sm:top-5 sm:right-5">
          <ThemeToggle />
        </div>

        <div className="mx-auto w-full max-w-sm">
          <div className="lg:hidden">
            <BrandMark size="lg" />
          </div>

          {onBack && (
            <div className="mt-5 lg:mt-0">
              <Button variant="ghost" size="xs" icon="arrow-left" onClick={onBack}>
                Back
              </Button>
            </div>
          )}

          <h1 className="nx-display mt-5 text-[1.75rem] leading-tight">{title}</h1>
          {subtitle && (
            <p className="mt-2 text-sm text-ink-muted">{subtitle}</p>
          )}

          <div className="mt-7">{children}</div>

          {footer && (
            <div className="mt-7 border-t border-line pt-5">{footer}</div>
          )}
        </div>
      </main>
    </div>
  );
}
