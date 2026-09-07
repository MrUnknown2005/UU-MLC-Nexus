# UU-MLC Nexus — Road to v1.0

> Living plan. We work top-to-bottom. Update the checkboxes and "Current position"
> as we go so any session (or model) can resume without re-investigating.
> Last updated: 2026-09-07

**Legend:** `[ ]` todo · `[~]` in progress · `[x]` done · ⚠️ caveat/gotcha · ❓ open decision

---

## Current position

**Phase 2 — Auth completion & full realtime sync.** All Phase 2 code is done and passing
(`npm run lint` + `npm run build`). Delete-account shipped (`a3896aa`). Realtime migration
applied & verified in Supabase. **Notification clearing added 2026-09-07** — per-member
"Clear all" + head-admin "Clear for everyone"; both RPCs applied & verified in Supabase.
Remaining before Phase 2 closes is **not code** — two live-run checks:

- **Forgot-password E2E** — ⏸️ **PARKED (2026-09-07, user decision).** Built in code but can't be
  live-tested: there's no email delivery set up (same blocker that killed the Resend farewell email).
  Revisit when email delivery exists. Not a blocker for closing Phase 2.
- **Two-client member-join** verification — a new member appears live without a refresh. Needs two
  browser sessions; no email required. This is the one still-actionable open item.

Phase 1 (mobile UI) done and committed.

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

Change-password is done. Remaining: build self-service **delete-account** (new top item),
and live-test forgot-password.

- [x] **Delete-account (self-service)** — ✅ **DONE & SHIPPED** (`a3896aa`). `DangerZonePanel` in
      `Profile.jsx` + `deleteOwnAccount()` in `authService.js`. Hard-delete everything via the
      `delete_own_account()` SECURITY DEFINER RPC (applied in the Supabase SQL editor); re-verifies
      the current password; typed-phrase confirm (`DELETE MY ACCOUNT`); signs out on success.
      ⚠️ **Farewell email DROPPED** (2026-09-02) — no sending domain; Resend not worth it. Do not re-raise.
- [x] **Change-password form** for logged-in members, in `src/components/pages/Profile.jsx`
      (new `PasswordPanel`, "Security" section). Re-verifies current password via new
      `changePassword()` in `authService.js`. Logs `PASSWORD_CHANGED` to the audit trail.
- [x] **Clear notifications** — ✅ **DONE 2026-09-07.** Per-member "Clear all" (own bell) +
      head-admin "Clear for everyone" (club-wide) in `NotificationBell.jsx`. Two SECURITY DEFINER
      RPCs `delete_own_notifications()` / `delete_all_notifications()` in
      `supabase/migrations/20260907_notification_clearing.sql` — **applied & verified in Supabase**.
      Head-admin authority enforced server-side (raises `42501`); UI gate is cosmetic. Admin wipe
      logs `WIPE_ALL_NOTIFICATIONS`; other members' bells clear live via the realtime subscription.
- [~] **Live-test forgot-password** end-to-end — ⏸️ **PARKED (2026-09-07):** built in code, but no
      email delivery set up, so it can't be run yet. Revisit when email exists. Not a Phase 2 blocker.

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

### ❓ Open decisions (Phase 2)

3. **Delete-account semantics → LOCKED: HARD-DELETE EVERYTHING (2026-09-02).** Remove
   `auth.users` + cascade all owned rows (point history, todos, notifications). True erasure;
   archived monthly winners survive (separate snapshot table). The RPC deletes owned rows
   explicitly if FK `ON DELETE CASCADE` isn't guaranteed.
4. **Farewell email on self-delete → LOCKED: RESEND, set up now (2026-09-02).** Member gets a
   warm goodbye email ("thank you for being with us") when they delete. Hard constraints:
   (i) must send *before* the `auth.users` row is deleted — deletion removes the email address;
   (ii) cannot be sent from the browser — needs a server-side secret. **Architecture:** send from
   inside the `delete_own_account()` RPC via **`pg_net`** (async HTTP POST to Resend), API key in
   **Supabase Vault**, then delete the user. Matches the repo's RPC pattern; no edge-fn/CLI/Deno.
   Needs from user: Resend account, a verified sending domain (or `onboarding@resend.dev` for a
   test), and an API key → stored in Vault. Free tier: 3k/mo, 100/day.

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
- ⚠️ **No `supabase/` dir in the repo right now** — migrations/RPCs are applied directly in the
  Supabase SQL editor and are not all kept in git (same landmine as the deleted RLS migration).
  For delete-account, keep the `delete_own_account()` SQL in the repo *and* apply it in the editor.

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
