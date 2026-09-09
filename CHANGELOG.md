# Changelog

All notable changes to UU-MLC Nexus are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — 2026-09-09

First public release: the internal workspace of the Uttara University Machine
Learning Club — member directory, task board, points leaderboard, announcements,
and club administration. Built on React 19 + Vite with Supabase (Postgres, Auth,
Storage).

### Added

- **Authentication** — email/password sign-in via Supabase Auth, self-service
  sign-up with a guest holding view for pending accounts, change-password with
  current-password re-verification, and self-service account deletion.
- **Role-based permissions** — Guest, Member, Executive, Administrator, and Head
  Administrator roles, each with a configurable permission set, plus a Role
  Manager for creating custom roles with granular grants.
- **Member directory & management** — approve members, change roles, and
  activate or deactivate accounts.
- **Points system** — award, track, and reset member points, with full history
  and a leaderboard.
- **To-Do / task board** — shared club tasks with deadlines and image attachments.
- **News feed** — club announcements with optional images.
- **Admin activity log** — an audit trail of administrative actions.
- **Notifications** — an in-app bell with per-member "Clear all" and a
  head-admin club-wide clear.
- **Live sync** — realtime updates across profiles, points, news, tasks,
  notifications, and the activity log.
- **Themed UI** — dark and light themes on a native system-font stack with a
  single amber accent; no webfont downloads or third-party requests.

### Performance

- Debounced (250 ms), payload-scoped realtime refetches and bounded
  point-history loads.
- Skeleton loading states on the data-driven tabs.
- Database advisors cleared to zero for unindexed foreign keys, un-wrapped RLS
  `auth.*` calls, and duplicate permissive policies.

### Accessibility

- Pass to WCAG 2.1 AA: landmark and heading structure, labelled controls,
  live-region result counts, and visible focus styles.

### Security

- Server-side authorization enforced through Row-Level Security behind every
  client-side gate; privileged actions run as `SECURITY DEFINER` RPCs with
  their own server-side authority checks.
- Self-award and self-reset of points blocked and capped server-side.
- Storage buckets (`avatars`, `attachments`) are private: the app stores object
  paths and renders images through short-lived signed URLs, with MIME-type and
  size limits enforced at the database layer.
- Deleting a task or news post, replacing its image, or deleting an account now
  removes the associated object from Storage rather than leaving it orphaned in
  a private bucket.
- HSTS and `X-Content-Type-Options: nosniff` served in production.

[1.0.0]: https://github.com/MrUnknown2005/UU-MLC-Nexus/releases/tag/v1.0.0
