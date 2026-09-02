# UU-MLC Nexus — Road to v1.0

> Living plan. We work top-to-bottom. Update the checkboxes and "Current position"
> as we go so any session (or model) can resume without re-investigating.
> Last updated: 2026-09-02

**Legend:** `[ ]` todo · `[~]` in progress · `[x]` done · ⚠️ caveat/gotcha · ❓ open decision

---

## Current position

**Phase 2 — Auth completion & full realtime sync.** Code written; **`npm run lint` and
`npm run build` both pass, and the realtime migration is applied & verified in Supabase
(all six tables confirmed in `supabase_realtime`) — 2026-09-02.** Remaining before Phase 2
closes: live-test only — the member-join fix (two-client) and forgot-password E2E. Phase 1
(mobile UI) done and committed.

---

## Phase roadmap

| # | Phase | Status |
|---|-------|--------|
| 1 | Mobile UI | ✅ done |
| **2** | **Auth completion & full realtime sync** | ← **active** |
| 3 | Functional + Security audit (app layer) | todo |
| 4 | Database / Supabase / RLS audit | todo |
| 5 | Performance & error handling | todo |
| 6 | Accessibility | todo |
| 7 | Final visual polish | todo |
| 8 | Production QA on Render | todo |
| 9 | Release / v1.0 | todo |

Phases 3–9 are intentionally light below — we scope each one properly when we reach it,
the way we scoped Phase 2. Ordering is deliberate: finish functionality → audit the data
layer → non-functional passes (perf → a11y → polish) → QA → ship.

---

## PHASE 2 — Auth completion & full realtime sync  ← ACTIVE

Two workstreams. Both are "finish the core functionality" before any audit.

### 2A · Auth completion

Most of this already exists — the only missing piece is change-password.

- [x] **Change-password form** for logged-in members, in `src/components/pages/Profile.jsx`
      (new `PasswordPanel`, "Security" section). Re-verifies current password via new
      `changePassword()` in `authService.js`. Logs `PASSWORD_CHANGED` to the audit trail.
- [ ] **Live-test forgot-password** end-to-end (logged-out → email → reset screen → new password).
      Code is built; this is a config + real-run check, not a code task.

### 2B · Full realtime sync (so one person's change is instantly visible to all)

- [x] **Migration:** `supabase/migrations/20260902_realtime_publication.sql`. Guarded/idempotent
      (DO block checks `pg_publication_tables` before each ADD). Enables `profiles`,
      `point_history`, `news`, `todos`, `notifications`, `admin_activity_log`.
      ✅ **Applied & verified in the Supabase SQL editor (2026-09-02)** — all six confirmed
      present in `supabase_realtime` via an EXCEPT check (no rows missing).
- [x] **New client subscription: `point_history`** — `subscribeToPointHistoryChanges` in
      `dashboardService.js`, wired into `useDashboardData.js` (runs for all members).
- [x] **New client subscription: `news`** — `subscribeToNewsChanges`, same wiring.
- [~] **Verify** the member-join bug is fixed (new member appears without a manual refresh).
      Migration now applied — remaining is a real two-client test.

### ✅ Decisions (locked 2026-09-02)

1. **Change-password re-verification → YES.** Require the current password and verify it
   (re-sign-in check) before calling `updateUser({password})`. Guards against account
   hijack from an unattended logged-in session.
2. **Migration style → DEFENSIVE.** Write a guarded/idempotent migration safe to run
   regardless of current publication state. No dashboard check required.

### ⚠️ Gotchas (Phase 2)

- ⚠️ **Two different causes of staleness** — don't conflate them:
  - *Server-side:* table not in the publication → Postgres never broadcasts. (This is `profiles` today.)
  - *Client-side:* no subscription code → nothing is listening. (This is `point_history`, `news`.)
    Adding these to the publication does nothing until we also add client subscriptions.
- ⚠️ **`monthly_leaderboard` is almost certainly a view** → cannot be added to a publication,
  and only changes at month-end. Skip it.
- ⚠️ **Reload-all pattern** — each change refetches ~6 queries per open client. Fine at club
  scale (dozens). Noted so it's not a surprise; not optimizing now.
- ⚠️ **Supabase built-in email is rate-limited** (a few/hour) — OK for testing, NOT production.
  Custom SMTP is deferred by decision (later phase).
- ⚠️ **Forgot-password redirect origin** must be allowlisted in Supabase
  Authentication → URL Configuration, or the link silently falls back to the site URL.

---

## Reference — findings so we never re-investigate

### Auth: what already exists

| Flow | State | Location |
|------|-------|----------|
| Forgot password (logged out → email link) | ✅ built | `AuthScreen.jsx` (`ForgotPassword`), `requestPasswordReset()` |
| Reset via email link (set new password) | ✅ built | `ResetPasswordScreen.jsx`, wired in `App.jsx` via `PASSWORD_RECOVERY` event |
| Change password (logged in) | ❌ missing | to build in `Profile.jsx`; `updatePassword()` service already present |

### Realtime: table-by-table state

| Table | Feeds | Client listening? | In publication? | Action |
|-------|-------|:---:|:---:|--------|
| `profiles` | members, points, roles | ✅ | ✅ | done |
| `point_history` | activity, history, leaderboard | ✅ | ✅ | done |
| `news` | announcements | ✅ | ✅ | done |
| `todos` | tasks | ✅ (2 places) | ✅ | done |
| `notifications` | the bell | ✅ (per-user) | ✅ | done |
| `admin_activity_log` | admin feed | ✅ (admin) | ✅ | done |
| `role_definitions` / `permissions` / `role_permissions` | RoleManager | ❌ | ❌ | **defer to Phase 4** (live permission changes mid-session are fiddly) |
| `monthly_leaderboard` | last month's board | ❌ | ❌ | **skip** (view; month-end only) |

### Key files

- Root router / auth states: `src/App.jsx`
- Auth service: `src/services/authService.js`
- Auth UI: `src/components/auth/AuthScreen.jsx`, `ResetPasswordScreen.jsx`
- Dashboard data + subscriptions: `src/hooks/useDashboardData.js`, `src/services/dashboardService.js`
- Own-profile page: `src/components/pages/Profile.jsx`
- Supabase client: `src/lib/supabaseClient.js`
- Existing migration: `supabase/migrations/20260822_security_rls_hardening.sql`
- Stack: React 19 + Vite + Tailwind 4, `@supabase/supabase-js` v2. No router lib (state-driven).

---

## Phases 3–9 — outline (scope when we reach them)

- **3 · Functional + Security audit (app layer):** every user action works & is authorized
  client-side; input validation; error paths; no secrets client-side. (RLS goes to Phase 4.)
- **4 · Database / Supabase / RLS audit:** RLS policies per table, SECURITY DEFINER fns,
  publication review, role/permission live-sync question from Phase 2.
- **5 · Performance & error handling:** query/index review, loading & error states,
  the reload-all pattern if it matters at real data size.
- **6 · Accessibility:** keyboard nav, focus, ARIA, contrast, screen-reader pass.
- **7 · Final visual polish:** consistency pass against DESIGN.md (system fonts, single amber
  accent, no AI-slop — per project design rules).
- **8 · Production QA on Render:** real deploy, env vars at build time, SMTP, smoke tests.
- **9 · Release / v1.0:** tag, changelog, deferred legal-compliance items (see memory).
