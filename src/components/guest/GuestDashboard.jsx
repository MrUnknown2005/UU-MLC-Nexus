import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Avatar } from "../ui/Avatar.jsx";
import { Badge } from "../ui/Badge.jsx";
import { Brand } from "../common/Brand.jsx";
import { Button } from "../ui/Button.jsx";
import { EmptyState } from "../ui/EmptyState.jsx";
import { Panel } from "../ui/Panel.jsx";
import { Skeleton } from "../ui/Skeleton.jsx";
import { ThemeToggle } from "../common/ThemeToggle.jsx";
import { usePrivacyPolicy } from "../legal/privacy-context.js";
import { displayName, formatDateTime, formatNumber } from "../../lib/format.js";

/**
 * What a guest sees: why they cannot get in yet, and the club news anyway.
 *
 * This screen cannot use the dashboard shell — a guest has no navigation, so a
 * rail with nothing in it would be a lie. It carries its own slim top bar
 * instead, holding only the three things a guest can actually do: switch theme,
 * see who they are signed in as, and leave.
 *
 * The news query is unchanged, but it now has the two states it was missing.
 * Before, a failed request and an empty club looked identical: "No news
 * published yet." Silence is not the same as nothing.
 */
function GuestDashboard({ profile, onLogout }) {
  const [news, setNews] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const { openPrivacy } = usePrivacyPolicy();

  const loadNews = useCallback(async () => {
    setStatus("loading");

    const { data, error } = await supabase
      .from("news")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error("Guest news load error:", error);
      setNews([]);
      setStatus("error");
      return;
    }

    setNews(data || []);
    setStatus("ready");
  }, []);

  useEffect(() => {
    // Intentional fetch-on-mount; loadNews is stable for the component's lifetime.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadNews();
  }, [loadNews]);

  const name = displayName(profile);

  return (
    <div className="nx-backdrop min-h-dvh">
      <header className="nx-safe-top sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur-md">
        <div className="mx-auto flex h-[var(--topbar-h)] w-full max-w-5xl items-center gap-3 px-4 sm:px-6">
          <Brand size="sm" />

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />

            {/* The avatar is the only place a guest can confirm which account
                they are waiting on — worth the space on a screen this empty. */}
            <span className="flex items-center gap-2 pl-1">
              <Avatar
                size="sm"
                src={profile.avatar_url}
                name={name}
                seed={profile.id}
              />
              <span className="hidden text-[0.8125rem] font-semibold sm:inline">
                {name}
              </span>
            </span>

            <Button variant="ghost" size="sm" icon="log-out" onClick={onLogout}>
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl space-y-5 px-4 py-6 sm:px-6 sm:py-9">
        <section className="nx-panel p-6 sm:p-9">
          <p className="nx-eyebrow inline-flex items-center gap-2 rounded-full border border-warn-line bg-warn-soft px-3 py-1.5 text-warn">
            <span className="nx-dot nx-dot-live" />
            Pending
          </p>

          <p className="mt-5 text-sm text-ink-muted">
            Welcome, <span className="font-semibold text-ink">{name}</span>
          </p>

          <h1 className="nx-display mt-2 text-[1.75rem] sm:text-[2.5rem]">
            Your account is <span className="text-brand-text">pending</span>
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-muted">
            An administrator needs to promote your account before you become a
            full club member. Hang tight — exciting things are happening in the
            meantime.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            <Badge tone="warn" icon="clock">
              Guest
            </Badge>
            <Badge tone="violet" icon="shield">
              Awaiting Approval
            </Badge>
            <Badge tone="brand" icon="trophy">
              {formatNumber(profile.points ?? 0)} pts
            </Badge>
          </div>
        </section>

        <Panel
          eyebrow="Updates"
          title="Club News"
          icon="newspaper"
          actions={
            status !== "loading" && (
              <Button
                variant="ghost"
                size="sm"
                icon="refresh"
                onClick={loadNews}
              >
                Refresh
              </Button>
            )
          }
          bodyClassName="space-y-3"
        >
          {status === "loading" && (
            <div aria-busy="true" aria-live="polite" className="space-y-3">
              <span className="sr-only">Loading club news…</span>
              {[0, 1].map((row) => (
                <div key={row} className="nx-card space-y-2.5 p-5">
                  <Skeleton className="h-5 w-1/2" />
                  <Skeleton className="h-3.5 w-full" />
                  <Skeleton className="h-3.5 w-4/5" />
                </div>
              ))}
            </div>
          )}

          {status === "error" && (
            <EmptyState
              icon="alert-triangle"
              title="Could not load club news"
              description="The announcements are there — this is a loading problem, not an empty club."
              action={
                <Button variant="secondary" icon="refresh" onClick={loadNews}>
                  Try again
                </Button>
              }
            />
          )}

          {status === "ready" &&
            (news.length === 0 ? (
              <EmptyState
                icon="newspaper"
                title="No news published yet."
                description="When the club posts an announcement it will appear here first."
              />
            ) : (
              news.map((item) => (
                <article key={item.id} className="nx-card nx-lift p-5">
                  <h2 className="nx-display text-lg">{item.title}</h2>

                  <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap text-ink-muted">
                    {item.content}
                  </p>

                  {item.created_at && (
                    <p className="mt-3.5 text-[0.75rem] text-ink-subtle">
                      {formatDateTime(item.created_at)}
                    </p>
                  )}
                </article>
              ))
            ))}
        </Panel>

        <footer className="nx-safe-bottom nx-eyebrow flex justify-center border-t border-line pt-5 sm:justify-end">
          <button
            type="button"
            onClick={openPrivacy}
            className="underline decoration-line-strong underline-offset-2 transition-colors hover:text-ink"
          >
            Privacy Policy
          </button>
        </footer>
      </main>
    </div>
  );
}

export default GuestDashboard;
