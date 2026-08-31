import { useState } from "react";
import { Avatar } from "../ui/Avatar.jsx";
import { Icon } from "../ui/Icon.jsx";
import { IconButton } from "../ui/IconButton.jsx";
import { Popover } from "../ui/Popover.jsx";
import { Brand } from "../common/Brand.jsx";
import { ThemeToggle } from "../common/ThemeToggle.jsx";
import NotificationBell from "./NotificationBell.jsx";
import { displayName, humanizeToken } from "../../lib/format.js";

/**
 * Sticky top bar.
 *
 * Holds the things that must be reachable from every tab: the command palette,
 * notifications, theme, and the account menu. The section title lives here too
 * rather than being repeated at the top of nine pages.
 */
export default function TopBar({
  title,
  profile,
  roleLabel,
  onOpenMenu,
  onOpenPalette,
  onSelectTab,
  onLogout,
  notifications,
  notificationsOpen,
  setNotificationsOpen,
  unreadCount,
  onMarkAllRead,
  onOpenNotification,
}) {
  const [accountOpen, setAccountOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur-md">
      <div className="flex h-[var(--topbar-h)] items-center gap-2 px-3 sm:px-5">
        <IconButton
          icon="menu"
          label="Open navigation"
          onClick={onOpenMenu}
          className="lg:hidden"
        />

        <div className="lg:hidden">
          <Brand size="sm" />
        </div>

        <h2 className="nx-display hidden min-w-0 flex-1 truncate text-[0.9375rem] lg:block">
          {title}
        </h2>

        <div className="flex-1 lg:hidden" />

        {/* Desktop: a real search-shaped affordance, because a bare ⌘K hint is
            invisible to anyone who has never used one. */}
        <button
          type="button"
          onClick={onOpenPalette}
          className="hidden h-9 items-center gap-2 rounded-control border border-line-strong bg-well px-3 text-[0.8125rem] text-ink-subtle transition-colors hover:border-brand-line hover:text-ink-muted md:flex md:w-56"
        >
          <Icon name="search" size={15} className="shrink-0" />
          <span className="flex-1 text-left">Search…</span>
          <kbd className="shrink-0 rounded-[5px] border border-line px-1.5 font-mono text-[0.625rem]">
            ⌘K
          </kbd>
        </button>

        <IconButton
          icon="command"
          label="Open command palette"
          onClick={onOpenPalette}
          className="md:hidden"
        />

        <NotificationBell
          open={notificationsOpen}
          onOpenChange={setNotificationsOpen}
          notifications={notifications}
          unreadCount={unreadCount}
          onMarkAllRead={onMarkAllRead}
          onOpenNotification={onOpenNotification}
        />

        <div className="hidden sm:block">
          <ThemeToggle />
        </div>

        <Popover
          open={accountOpen}
          onOpenChange={setAccountOpen}
          label="Account"
          align="end"
          width="15rem"
          renderTrigger={(triggerProps) => (
            <button
              {...triggerProps}
              type="button"
              aria-label="Account menu"
              className="ml-0.5 rounded-full ring-offset-2 ring-offset-canvas transition-shadow hover:ring-2 hover:ring-brand-line"
            >
              <Avatar
                src={profile.avatar_url}
                name={displayName(profile)}
                seed={profile.id}
                size="sm"
              />
            </button>
          )}
        >
          <div className="border-b border-line px-3.5 py-3">
            <p className="truncate text-[0.8125rem] font-semibold text-ink">
              {displayName(profile)}
            </p>
            <p className="truncate text-[0.6875rem] text-ink-subtle">
              {profile.email}
            </p>
            <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-[0.625rem] font-bold tracking-wide text-brand-text uppercase">
              {roleLabel ?? humanizeToken(profile.role)}
            </p>
          </div>

          <div className="p-1.5">
            <MenuItem
              icon="user"
              onClick={() => {
                setAccountOpen(false);
                onSelectTab("profile");
              }}
            >
              Your profile
            </MenuItem>

            <div className="flex items-center justify-between gap-2 rounded-control px-2.5 py-1.5 sm:hidden">
              <span className="text-[0.8125rem] text-ink-muted">Theme</span>
              <ThemeToggle size="sm" />
            </div>

            <MenuItem
              icon="log-out"
              tone="danger"
              onClick={() => {
                setAccountOpen(false);
                onLogout();
              }}
            >
              Sign out
            </MenuItem>
          </div>
        </Popover>
      </div>
    </header>
  );
}

function MenuItem({ icon, tone, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        tone === "danger"
          ? "flex w-full items-center gap-2.5 rounded-control px-2.5 py-2 text-left text-[0.8125rem] font-medium text-danger transition-colors hover:bg-danger-soft"
          : "flex w-full items-center gap-2.5 rounded-control px-2.5 py-2 text-left text-[0.8125rem] font-medium text-ink-muted transition-colors hover:bg-hover hover:text-ink"
      }
    >
      <Icon name={icon} size={15} className="shrink-0" />
      {children}
    </button>
  );
}
