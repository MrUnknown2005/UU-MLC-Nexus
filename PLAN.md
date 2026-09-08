# UU-MLC Nexus — Road to v1.0

> Living plan. We work top-to-bottom. Update the checkboxes and "Current position"
> as we go so any session (or model) can resume without re-investigating.
> Last updated: 2026-09-07

**Legend:** `[ ]` todo · `[~]` in progress · `[x]` done · ⚠️ caveat/gotcha · ❓ open decision

---

**Phase 4 — Database / Supabase / RLS audit.** Audit **COMPLETE** and **remediation APPLIED &
verified live (2026-09-08)** via the Supabase MCP server (project `scgqhsxfzqvsqiugnceg`). Full ledger
in the **PHASE 4** section below and in memory (`phase-4-audit`). Migration `20260908013032_phase4_db_
hardening` landed the fixes; the **full-schema baseline** (`00000000000000_baseline_schema.sql`) now lets
the repo rebuild the DB from scratch (drift landmine closed). MCP server restored to **read-only**.
**M-2b is now code-complete** (signed-URL reader + path-storing uploads; lint/build-green) with the DB
flip authored as `20260908090000_phase4_m2b_private_buckets.sql` — **apply it at deploy time** (after this
code is the running build). Only **L-6** (HIBP dashboard toggle) remains untouched.

**Headline:** the server-side authz model is genuinely solid. Phase 3's handoffs **F-1 and F-6 are
already closed server-side** — broad RLS policies are deliberately scoped by `BEFORE UPDATE` triggers,
and every mutation RPC checks caller role internally. RLS is ON for all 14 public tables. So the real
work is a short list of drift/hardening items, not a broken security model. See PHASE 4 below.

**Still-open Phase 2 live-checks** (not code; don't lose them): forgot-password E2E ⏸️ PARKED (no email
delivery); two-client member-join verification (two browser sessions, no email).

Phases 1–3 done. Phase 3 commits (`301a646`, `70ee2ca` on `claude/relaxed-heyrovsky-7f05f1`) remain
**unpushed/unmerged** — still awaiting user go-ahead.

---

## Phase roadmap

| # | Phase | Status |
|---|-------|--------|
| 1 | Mobile UI | ✅ done |
| 2 | Auth completion & full realtime sync | ✅ done (2 live-checks parked) |
| 3 | Functional + Security audit (app layer) | ✅ done (unpushed) |
| **4** | **Database / Supabase / RLS audit** | ← **active** (audit done; fixes pending) |
| 5 | Performance & error handling | todo |
| 6 | Accessibility | todo |
| 7 | Final visual polish | todo |
| 8 | Production QA on Render | todo |
| 9 | Release / v1.0 | todo |

Phases 3–9 are intentionally light below — we scope each one properly when we reach it,
the way we scoped Phase 2. Ordering is deliberate: finish functionality → audit the data
layer → non-functional passes (perf → a11y → polish) → QA → ship.

---

## PHASE 2 — Auth completion & full realtime sync  ✅ DONE (2 live-checks parked)

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

## PHASE 4 — Database / Supabase / RLS audit  ← ACTIVE (remediation + baseline done; M-2b code done, DB flip pending deploy; L-6 pending)

Read-only audit complete (2026-09-08); **remediation APPLIED & verified live (2026-09-08)** via the
Supabase MCP server (flipped to write mode for the apply, now **restored to read-only**). Migration
`20260908013032_phase4_db_hardening` is in DB history **and** versioned in the repo. The full-schema
**baseline** `00000000000000_baseline_schema.sql` closes the migration-drift landmine — the repo can
rebuild the DB from scratch. Decisions taken: **strip Resend** + **apply via MCP write mode**. Only two
deferred items remain (M-2b, L-6).

### Verdict — the authz model is solid (don't rebuild it)

- RLS **enabled on all 14 public tables**. Every mutation RPC checks `current_user_role()` /
  `has_permission()` internally (all correctly require `is_active`).
- The pattern is deliberate: **broad RLS policies scoped by `BEFORE UPDATE` triggers** that enforce
  column-level rules — `protect_profile_self_updates`, `protect_profile_role_changes`,
  `protect_todo_member_updates`. Phase 3's **F-1** (roleService writes) and **F-6** (raw profiles
  role/is_active UPDATE) are **already closed server-side**. The client gates are UX; the boundary holds.
- Head-admin-gated wipes all verify `head_admin` server-side (raise `42501`). Storage **writes** are
  correctly gated (admins for `attachments`, own-folder for `avatars`).

### Findings (severity-ranked) — status after remediation

- 🔴 **H-1 · `delete_own_account()` Resend drift + dangling secret.** ✅ **FIXED.** RPC rewritten to a
  clean pure-delete (no Vault read, no `net.http`, no email — verified: `has_resend/has_net/has_vault`
  all 0). `pg_net` extension dropped; `resend_api_key` deleted from Vault. Decision taken: **strip**
  (honor the locked "email dropped" decision).
- 🟡 **M-1 · `award_points` / `reset_member_points` missing server-side guards.** ✅ **FIXED.** Both now
  reject `p_member_id = auth.uid()` (no self-dealing); `award_points` caps `abs(p_points) > 100000`
  (mirrors client `MAX_POINT_ADJUSTMENT`). Enforced inside the SECURITY DEFINER fns.
- 🟡 **M-2a · Storage buckets unhardened.** ✅ **FIXED.** Both buckets now pin
  `allowed_mime_types = {jpeg,png,webp,gif}` (SVG excluded — the XSS vector) and `file_size_limit = 8 MB`
  (matches `uploadAttachment.js`).
- 🟠 **M-2b · Buckets public.** 🟢 **CODE DONE (2026-09-08); DB flip pending deploy.** App now stores object
  *paths* and mints short-lived (1 h) signed URLs on read — `src/lib/storageImage.js` (`useSignedImageUrl`),
  used inside `<Avatar>` and `<SafeImage>`; uploads in `uploadAttachment.js` + `Profile.jsx` now store paths.
  The reader is **dual-mode** (a value with an `http:`/`blob:`/`data:` scheme passes through, a bare path is
  signed), so there is **no flag-day**: legacy public-URL rows keep rendering until they are rewritten. The
  DB half — rewrite the 4 legacy public-URL rows → paths, then set both buckets `public=false` — is authored
  as `20260908090000_phase4_m2b_private_buckets.sql`; **apply it after this code is the running build** (order
  matters — see the file header). The existing `to authenticated` SELECT policies already authorise the
  signing, so members keep seeing every image while `anon` is locked out.
- 🟡 **L-1 · `anon` holds EXECUTE** on the 3 later-added RPCs. ✅ **FIXED.** `anon` EXECUTE revoked on
  `delete_own_account` / `delete_own_notifications` / `delete_all_notifications`; `authenticated` retained.
  Advisor lint 0028 (anon) now clears. *(0029 — `authenticated` can call SECURITY DEFINER fns — remains
  for all 17 RPCs and is BY DESIGN: they're meant to be called by signed-in users and authorize
  internally. Won't-fix.)*
- 🟡 **L-2 · `profiles.role` free text.** ✅ **FIXED.** Added FK `profiles_role_fkey` →
  `role_definitions(role_key)` (validated clean; no orphan roles).
- 🟡 **L-3 · latent policy/trigger mismatch.** ✅ **FIXED.** `protect_profile_self_updates` now gates
  other-profile edits on `has_permission('manage_members')`, matching the RLS policy (column-level role
  protection still enforced by `protect_profile_role_changes`).
- 🟡 **L-4 · Zero CHECK constraints.** ✅ **FIXED.** Added `profiles.points >= 0` + text-length caps on
  profiles (name/nickname/bio), news (title/content), todos (title/description), point_history (reason).
  Caps are generous supersets of app limits; verified no existing row rejected.
- 🟡 **L-5 · Duplicate `avatars` storage policies.** ✅ **FIXED.** Dropped the redundant INSERT+UPDATE
  pair; one of each remains.
- 🟡 **L-6 · Leaked-password protection (HIBP) disabled.** ⏸️ **DEFERRED — user will do this
  dashboard toggle themselves, later (their call, 2026-09-08).** Auth **dashboard** toggle, not SQL:
  Dashboard → **Authentication → Providers → Email** → tick **"Prevent the use of leaked passwords"**
  (checks HaveIBeenPwned). One-click, no code. ⚠️ **Requires the Pro plan or above** — if the project
  is on Free, this toggle is unavailable and L-6 stays deferred until an upgrade.

### ✅ Process landmine — migration drift (RESOLVED 2026-09-08)

Closed by dumping the full live schema into a versioned baseline:
`supabase/migrations/00000000000000_baseline_schema.sql` — a single, standalone, **idempotent**
snapshot of the entire live `public` schema (14 tables + constraints/indexes, all **27 functions**
with catalog-verified bodies, 8 triggers, ~40 RLS policies, both storage buckets + their 9 policies,
and the `supabase_realtime` publication), reconstructed from the live Postgres catalogs. It is a
**superset** of every incremental migration, so **the repo can now rebuild the DB from scratch** by
running that one file. `supabase/migrations/README.md` documents the baseline-vs-incrementals model.
The old drift (notification_clearing not in DB history; realtime_publication absent from repo; pre-Aug-22
objects not in git) is now subsumed by the baseline. ⚠️ Baseline restores **schema only** — the
`role_definitions`/`permissions`/`role_permissions` seed rows must still be loaded separately.

### Performance (→ defer to Phase 5, noted so we don't re-discover)

15 unindexed FKs · 15 `auth_rls_initplan` warnings (wrap `auth.uid()`/`current_user_role()` in
`(select …)`) · 3 `multiple_permissive_policies` (profiles UPDATE ×4, point_history SELECT ×2, todos
UPDATE ×2) · 2 unused indexes · `pg_net` 0.20.4 sits in `public` (removed if H-1 strips Resend).

### ✅ Decisions (locked & done 2026-09-08)

1. **H-1 Resend → STRIPPED.** Honored the locked "email dropped" decision; removed code + key + `pg_net`.
2. **Apply method → MCP WRITE MODE.** Server's `--read-only` flag removed in `~/.claude.json`; applied
   via `apply_migration`. ⚠️ **The server is now in WRITE mode** — restore `--read-only` (+ reload) if you
   want to lock it back to read-only for normal use.

### Remaining Phase 4 work

- 🟢 **M-2b** — **code done + lint/build-green** (signed-URL reader `src/lib/storageImage.js` + path-storing
  uploads; `<Avatar>`/`<SafeImage>` resolve paths). DB migration authored
  (`20260908090000_phase4_m2b_private_buckets.sql`) — **apply at deploy** (rewrites legacy URL rows → paths,
  then flips both buckets `public=false`). Not yet applied (needs to land with the running build).
- ⏸️ **L-6** — enable HIBP leaked-password protection. **User will do this dashboard toggle later
  (2026-09-08).** Path: **Authentication → Providers → Email → "Prevent the use of leaked passwords"**.
  ⚠️ Pro-plan-and-above feature.
- [x] **Schema baseline** — ✅ **DONE 2026-09-08.** `00000000000000_baseline_schema.sql` +
  `README.md` in `supabase/migrations/`. Full live schema, idempotent, catalog-verified; repo can now
  rebuild the DB. Migration-drift landmine closed (see above).
- ✅ **MCP read-only restored** — `--read-only` re-added to the Supabase server in `~/.claude.json`
  (takes effect on next session reload). Write mode was only needed for the 20260908013032 apply.
- Then: instant-deactivation-via-realtime (Phase 3 handoff) — decide if it moves here or to a later phase.

---



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
- Only migration file in repo: `supabase/migrations/20260907_notification_clearing.sql` ⚠️ (see Phase 4
  migration-drift landmine — the live DB has 3 *other* migrations in history and this file isn't among them)
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
