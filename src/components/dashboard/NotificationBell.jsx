import { Popover } from "../ui/Popover.jsx";
import { IconButton } from "../ui/IconButton.jsx";
import { Icon } from "../ui/Icon.jsx";
import { cn } from "../../lib/cn.js";
import { formatRelative } from "../../lib/format.js";

const TYPE_ICON = {
  news: "newspaper",
  todo: "check-circle",
  points: "trophy",
  member: "users",
};

const TYPE_TONE = {
  news: "bg-info-soft text-info",
  todo: "bg-success-soft text-success",
  points: "bg-brand-soft text-brand-text",
  member: "bg-violet-soft text-violet",
};

/**
 * Notification bell and its panel.
 *
 * Two changes that matter more than the styling: the panel is a real dialog
 * that closes on Escape and on an outside press, and the unread dot is paired
 * with text for screen readers — the old build signalled "unread" with colour
 * alone.
 */
export default function NotificationBell({
  open,
  onOpenChange,
  notifications,
  unreadCount,
  onMarkAllRead,
  onOpenNotification,
}) {
  return (
    <Popover
      open={open}
      onOpenChange={onOpenChange}
      label="Notifications"
      align="end"
      width="23rem"
      renderTrigger={(triggerProps) => (
        <IconButton
          {...triggerProps}
          icon="bell"
          label={
            unreadCount > 0
              ? `Notifications, ${unreadCount} unread`
              : "Notifications"
          }
        >
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 font-display text-[0.5625rem] font-bold text-brand-ink tabular-nums">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </IconButton>
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <p className="text-[0.8125rem] font-semibold text-ink">Notifications</p>
          <p className="text-[0.6875rem] text-ink-subtle">
            {unreadCount > 0
              ? `${unreadCount} unread`
              : "You're all caught up"}
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={onMarkAllRead}
            className="shrink-0 text-[0.75rem] font-semibold text-brand-text underline decoration-brand-line underline-offset-2 hover:decoration-brand"
          >
            Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="px-4 py-10 text-center">
          <span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-surface-2 text-ink-subtle">
            <Icon name="inbox" size={18} />
          </span>
          <p className="mt-3 text-[0.8125rem] text-ink-muted">
            Nothing here yet. New tasks, points and announcements will show up.
          </p>
        </div>
      ) : (
        <ul className="nx-scroll-y max-h-[24rem]">
          {notifications.map((notification) => {
            const unread = !notification.read_at;

            return (
              <li key={notification.id}>
                <button
                  type="button"
                  onClick={() => onOpenNotification(notification)}
                  className={cn(
                    "flex w-full gap-3 border-b border-line px-4 py-3 text-left transition-colors last:border-b-0",
                    unread ? "bg-brand-soft/50" : "hover:bg-hover"
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-[8px]",
                      TYPE_TONE[notification.type] ?? "bg-surface-2 text-ink-subtle"
                    )}
                  >
                    <Icon
                      name={TYPE_ICON[notification.type] ?? "bell"}
                      size={14}
                    />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span className="text-[0.8125rem] leading-snug font-semibold text-ink">
                        {notification.title}
                      </span>
                      {unread && (
                        <>
                          <span
                            aria-hidden="true"
                            className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand"
                          />
                          <span className="sr-only">Unread</span>
                        </>
                      )}
                    </span>

                    <span className="mt-0.5 block text-[0.8125rem] leading-snug text-ink-muted">
                      {notification.message}
                    </span>

                    <time
                      dateTime={notification.created_at}
                      className="mt-1.5 block text-[0.6875rem] text-ink-subtle"
                    >
                      {formatRelative(notification.created_at)}
                    </time>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Popover>
  );
}
