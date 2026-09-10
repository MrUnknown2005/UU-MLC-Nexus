# UU-MLC Nexus — Road to v1.0

> Living plan. We work top-to-bottom. Update the checkboxes and "Current position"
> as we go so any session (or model) can resume without re-investigating.
> Last updated: 2026-09-11

**Legend:** `[ ]` todo · `[~]` in progress · `[x]` done · ⚠️ caveat/gotcha · ❓ open decision

---

**Phase 4 — Database / Supabase / RLS audit. ✅ DONE.** Audit complete and **remediation APPLIED &
verified live (2026-09-08)** via the Supabase MCP server (project `scgqhsxfzqvsqiugnceg`). Full ledger
in the **PHASE 4** section below and in memory (`phase-4-audit`). Migration `20260908013032_phase4_db_
hardening` landed the fixes; the **full-schema baseline** (`00000000000000_baseline_schema.sql`) lets
the repo rebuild the DB from scratch (drift landmine closed). MCP server restored to **read-only**.
**M-2b is DONE & LIVE** — signed-URL reader + path-storing uploads on `main` (`2433a0f`), and the DB flip
(`20260908090000_phase4_m2b_private_buckets.sql`, applied `7255fec`) rewrote the legacy avatar rows → paths
and set both buckets private (verified: 2 private, 0 public, no `http%` rows left). Only **L-6** (HIBP
dashboard toggle) remains — **deferred to the user**, who will flip it themselves later.

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
| **4** | **Database / Supabase / RLS audit** | ✅ done (only L-6 dashboard toggle, deferred to user) |
| 5 | Performance & error handling | ✅ done & pushed to `main` @ `58ad5d6` (5D applied & verified live 2026-09-08) |
| 6 | Accessibility | ✅ done & pushed to `main` @ `58ad5d6` (scope = Meds + cheap Lows) |
| 7 | Final visual polish | ✅ done & shipped to `main` @ `a5bc922` |
| 8 | Production QA on Render | ✅ QA pass @ `a5bc922` (1 user check pending: interactive click-through) |
| 9 | Release / v1.0 | ✅ released — `v1.0.0` @ `a1211a0`, patched to `v1.0.1` @ `08d77a6` (notification-wipe fix); `origin/main` @ `08d77a6` |

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

## PHASE 4 — Database / Supabase / RLS audit  ← DONE (remediation + baseline + M-2b all live; only L-6 dashboard toggle left, deferred to user)

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
- 🟠 **M-2b · Buckets public.** ✅ **DONE & LIVE (2026-09-08).** Code on `main` (`2433a0f`) + DB flip applied
  (`7255fec`). App stores object *paths* and mints short-lived (1 h) signed URLs on read —
  `src/lib/storageImage.js` (`useSignedImageUrl`), used inside `<Avatar>` and `<SafeImage>`; uploads in
  `uploadAttachment.js` + `Profile.jsx` store paths. The reader is **dual-mode** (a value with an
  `http:`/`blob:`/`data:` scheme passes through, a bare path is signed) so the rollout was flag-day-free.
  Migration `20260908090000_phase4_m2b_private_buckets.sql` rewrote the 4 legacy public-URL avatar rows →
  paths and flipped both buckets `public=false`. **Verified live:** `private_buckets=2, public_buckets=0`,
  zero `http%` rows left in profiles/news/todos. The `to authenticated` SELECT policies authorise the
  signing, so members see every image while `anon` is locked out.
  ⚠️ **Migration gotcha (fixed in `7255fec`):** the backfill runs unauthenticated, so it must disable
  `protect_profile_self_updates` + `protect_todo_member_updates` around its UPDATEs (re-enabled in the same
  txn); `protect_profile_roles` stays on (avatar-only update leaves role unchanged).
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

- ✅ **M-2b** — **DONE & LIVE (2026-09-08).** Code on `main` (`2433a0f`); DB migration
  `20260908090000_phase4_m2b_private_buckets.sql` applied (`7255fec`) — 4 legacy avatar rows rewritten →
  paths, both buckets flipped `public=false`. Verified live: `private_buckets=2, public_buckets=0`, no
  `http%` rows remain.
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

## PHASE 5 — Performance & error handling  ← DONE & PUSHED to `main` @ `58ad5d6` (2026-09-08; 5A–5C code + 5D applied & verified live)

Scoped from two parallel code surveys + live DB advisors/row-counts. **Key framing: the live data is
tiny** (largest table = notifications @ 60 rows; point_history / todos / news = 0), so the DB perf
backlog is **correct-at-scale hardening, not live pain**. The real user-facing wins are app-layer: the
realtime **reload-all fan-out has no debounce**, one unbounded query grows forever, and several failures
are **invisible** (console-only). Surveys also confirmed the good news: **no subscription leaks, no N+1,
service layer is a clean consistent `{data,error}` contract** — this is hardening, not rework.

**Decisions locked 2026-09-08:** full pass (all four workstreams below) + **debounce + scoped refetch**
(coalesce bursts AND use the realtime payload to refetch only the affected query group, not all 6).

### STATUS — 2026-09-08 · DONE & PUSHED to `main` @ `58ad5d6` (5D applied & verified live)

**5A, 5B, 5C** implemented in worktree `claude/strange-wilson-fb4cb8`, verified green (lint clean · build
149 modules · 8/8 tests). **5D APPLIED to the live DB (2026-09-08, via SQL editor)** —
`supabase/migrations/20260908130000_phase5_perf_advisors.sql` (+ matching `00000000000000_baseline_schema.sql`
edit). **Verified via `get_advisors(performance)` post-apply:** the three target categories are **cleared to
zero** — `unindexed_foreign_keys` 15→0, `auth_rls_initplan` 15→0, `multiple_permissive_policies` 3→0. The
only remaining perf finding is `unused_index`, now **17** (the 15 new FK covering indexes + the 2 pre-existing
kept ones); every one is "unused" only because the pre-launch DB has no traffic yet — the expected, benign
flip side of adding covering indexes on an empty DB, not a regression. **Nothing committed/pushed yet.**

### 5A · Realtime refetch fan-out  (highest impact)

- [x] **Debounce + payload-aware refetch** in `useDashboardData.js` / `dashboardService.js`. Today every
  event on profiles/point_history/news/activity calls `loadData`, which refetches **all 6 queries**
  ignoring the payload — one admin point-award (writes 3 tables) → ~18 queries per open admin client;
  bulk RPCs → event storms (`dashboardService.js:17-54`, `useDashboardData.js:27-80,90-121`). Fix:
  coalesce events in a ~250 ms window and refetch only the query group for the changed table. Keep a
  full `loadData()` for the initial mount + the manual `loadData` callers (member actions await it).
- [x] **Bound `allPointHistory`** (`dashboardService.js:31-36`) — currently unbounded, grows forever,
  re-pulled for every history-viewer on every reload. Add `.limit(500)` (matches admin_activity_log).
  ⚠️ **Safe check DONE:** `allPointHistory` is **display-only** (`Points.jsx:269,274,277` — a count + the
  `AdminPointHistory` list); no totals/leaderboard are summed from it (those come from `profiles.points`
  + `monthly_leaderboard`), so a LIMIT cannot corrupt any number. Personal `pointHistory` (which
  `Overview.jsx:196` reduces) is per-member and stays unbounded.

### 5B · Silent failures → user-visible  (high impact)

- [x] **Dashboard load failures** (`useDashboardData.js:41-79`) — a failed/RLS-blocked fetch is
  `console.error`'d and the list reset to `[]`, so it looks identical to "empty club." Surface a toast
  (and keep the console log). `GuestDashboard`/`App` already do this right — mirror them.
- [x] **Profile stats swallow errors** (`Profile.jsx:217-264`) — 3 queries, zero `.error` checks; failure
  renders rank `—`/`0` entries as if real. Check errors; toast on failure.
- [x] **Notification actions fail silently** (`useNotifications.js:47,66,83,95`) — mark-read / mark-all /
  clear-own / clear-all return `false` on error but callers (`openNotification`, TopBar) never check.
  Toast on failure (the hook already has the boolean; wire a toast in the hook itself).
- [x] **usePermissions silent legacy fallback** (`usePermissions.js:47,59`) — quietly drops to
  `LEGACY_ROLE_PERMISSIONS` on error (console.warn only), changing which tabs/actions show. Decide:
  toast a soft warning, or leave (document why). Lowest of this group.

### 5C · Loading states  (medium impact)

- [x] **Consistent skeletons** on the bare pages. Only Todo / RoleManager / (partial) Profile show
  loading; Overview, Members, Points, Directory, AdminActivity, News render zeros during the initial
  central fetch, so first paint reads as "no data." The shared `SkeletonRegion` (`Skeleton.jsx`, has
  `aria-busy`/`aria-live`) exists but **nobody uses it**. Add an initial-load flag from
  `useDashboardData` and gate the data pages on it with `SkeletonRegion`.

### 5D · DB perf migration  (low live impact; correct-at-scale)

- [x] One migration for the advisor backlog (verified current 2026-09-08): **15 unindexed FKs** (add
  covering indexes), **15 `auth_rls_initplan`** (wrap `auth.uid()`/`current_user_role()` in `(select …)`
  so they evaluate once per query, not per row), **3 `multiple_permissive_policies`** (point_history
  SELECT ×2, profiles UPDATE ×4, todos UPDATE ×2 — consolidate where safe), **2 unused indexes**
  (`todo_activity_log_created_at_idx`, `role_permissions_permission_idx` — drop or leave, decide). ⚠️
  These cost ~nothing at current row counts; do them because they're cheap and future-proof, and update
  the schema baseline to match. Apply needs MCP write mode (currently read-only) or the SQL editor.

### Notes / deferred

- ⚠️ **Reload-all is per-open-client** — even after 5A, N open admin clients each hold their own
  subscriptions. Fine at club scale; not building shared-cache/broadcast fan-in.
- Per-component signed-URL requests (Phase 4 M-2b) are a touch chatty — batch-signing is a possible
  future optimization, not in this pass.
- Instant-deactivation-via-realtime (Phase 3 handoff) still unplaced — revisit at Phase 5 close.

---

## Phase 6 — Accessibility (✅ done & pushed to `main` @ `58ad5d6`)

WCAG 2.1 AA pass. Audit found the design system already a11y-mature (global `:focus-visible`,
`prefers-reduced-motion` reset, `html lang`, `--brand-text` contrast token, `useFocusTrap` on
Modal/Sheet, skip-link). Scope taken (user decision): **all Meds + the cheap Lows**; deferred the
high-false-positive items (Tooltip, PointHistory) and L6/L8/L9/L10/L12/L13. Lint + build green.

- **M1** `Field` error `<p>` → `role="alert"` — every form error now speaks on appearance (4.1.3).
- **M2** `CommandPalette` — real focus capture/restore + Tab trapped to the single input (it is a
  virtual-focus listbox via `aria-activedescendant`); dropped `autoFocus` so the opener is captured
  first. Not `useFocusTrap` (its selector counts `tabindex=-1` options).
- **M3** `ToastProvider` — auto-dismiss timer pauses on hover/focus, resumes on leave/blur.
- **M4** headings — **`TopBar` is the single `<h1>` per view** (sr-only on mobile, visible ≥lg);
  `Panel title` = `<h2>`. Fixed the real defects: Profile double-`<h1>` (hero name → `<h2>`),
  h2→h4 skips in Overview/Points(×2)/PointReset(×2)/News (→`<h3>`), Directory h1→h3 (member card
  →`<h2>`). Members/AdminActivity/Todo/RoleManager already descend correctly.
- **M5** mobile menu button `aria-expanded` + `aria-controls` → nav `Sheet` (`useId`); rail
  `<aside>`→`<div>` so the inner `<nav>` is the sole nav landmark.
- **M6** filter counts — `SearchInput` already has a built-in `aria-live` count; Members/Directory
  passed it. Only real gap was AdminActivity keying it to the search box only → now keyed to
  `filtering`, so the Action/Administrator selects announce too.
- **L1** `Popover` focus into panel on open + restore to trigger on Esc/select (skip on outside-click).
- **L2** deleted dead `common/NavItem.jsx` + `common/Tab.jsx` (no imports).
- **L4** `SafeImage` fallback tile: `role="img"` only when `alt` given, else `aria-hidden`.
- **L5** news image `alt=""` (Overview + News cards) — was duplicating the title heading.
- **L7** password-reveal button no longer `tabIndex={-1}` — keyboard-reachable.
- **L11** `ErrorBoundary` moves focus to its heading (`tabIndex={-1}`) + `role="alert"` on fallback.

---

## Phase 7 — Final visual polish  ✅ DONE & SHIPPED to `main` @ `a5bc922`

Consistency pass against `DESIGN.md` (single amber accent, solid surfaces + hairlines, dark + light, native
system fonts — see the `avoid-ai-slop-design` project rule). Scope (user decision "+ visual nits"):
**C1–C3 cruft removal · D1 DESIGN.md rewrite · V1/V2 landing nits · a password-field alignment bug**.
Verified green: lint · build 149 modules · 8/8 tests · reveal toggle round-trips. NOT selected: R1 radius-token pass.

- **C1** deleted `src/App.css` (dead Vite boilerplate). **C2** deleted `src/assets/react.svg` + `vite.svg`
  (unreferenced). **C3** `npm uninstall motion` — the app is CSS-keyframe-only; framer-motion was never imported.
- **D1** rewrote `DESIGN.md` to document the *shipped* system (tokens as source of truth, single amber accent,
  solid surfaces, dark + light, WCAG 2.1 AA) instead of the abandoned glass / near-black / 5-accent vision.
- **V1** removed the badge-above-headline hero tell on the landing page. **V2** module-card titles → `<h2>`.
- **Bug fix (user-spotted mid-phase):** `IconButton` owns a base `position: relative`; `PasswordInput` stacked
  `absolute` on the *same* element, so Tailwind's compiled source order let `relative` win — the reveal toggle
  fell into flow, stretched the field wrapper to 76px, and every `top-1/2` icon then centered ~16–22px too low.
  Fixed by wrapping the toggle in a positioned `<span>` (measured delta 16/22 → 0). Root cause: `cn()`
  deliberately does no Tailwind conflict resolution, so a caller appending a *conflicting* position utility slips through.

---

## Phase 8 — Production QA on Render  ✅ QA PASS @ `a5bc922` (2 user checks pending)

Live at **https://uumlcnexus.onrender.com**. QA'd HTTP-level via `curl` + bundle inspection — the in-app
Browser pane can't attach to external URLs on this install, so the served shell/bundle are verified but the
live React app wasn't driven from here. All four Phase 8 pillars pass:

- **Real deploy ✓** — prod serves the actual Phase 7 build; CSS `index-BWFTvFN1.css` hash byte-identical to
  the local build; 200 via Cloudflare.
- **Env vars at build time ✓** — `VITE_SUPABASE_URL` + the `sb_publishable_…` key (new-format publishable,
  public-by-design) are both inlined; the "Missing Supabase environment variables" guard was
  dead-code-eliminated (proof both were truthy at build). *(The legacy anon-JWT prefix is absent only because
  prod uses the publishable key while local `.env` uses the legacy JWT — same project, both valid public keys, not a defect.)*
- **Bundle security ✓** — no `sb_secret_<key>` leak (the lone `sb_secret_` is the SDK's key-prefix classifier);
  response headers include HSTS (`max-age=315360000; includeSubdomains; preload`) + `x-content-type-options: nosniff`.
- **Smoke ✓** — all referenced assets return 200 with correct content-types.

**SMTP — DECIDED (2026-09-09, user):** ship v1 on Supabase's built-in rate-limited sender; forgot-password
stays parked; consistent with the locked drop-Resend decision. No custom SMTP for v1.

**LOW / cosmetic (non-blocking):** `site.webmanifest` is served as `binary/octet-stream` (not
`application/manifest+json`); no `X-Frame-Options` / CSP / `Referrer-Policy` / `Permissions-Policy` headers
(HSTS + nosniff do exist). **INFO:** a deep path like `/foo` → 404 is harmless — the app has no client-side
router; the only external entry points are the origin root and reset `redirectTo: window.location.origin`.

**⏳ USER actions:**
1. ✅ **DONE (2026-09-09, via Management API)** — **Supabase → Authentication → URL Configuration**:
   Site URL → `https://uumlcnexus.onrender.com`; allow list → `…onrender.com/**`, `…onrender.com`,
   `http://localhost:3000/**`, `http://localhost:3000`. Root cause was the untouched default localhost
   Site URL + an empty allow list, so every reset `redirectTo` fell back to `localhost:3000`
   (dead on a phone). Verified by read-back of the live config.
2. **⏳ Interactive click-through** (still needs you) — log in, check the guest view, do one action per module on the live site.

*(This docs commit lands on `main` and triggers a Render redeploy, but changes only `PLAN.md` + `README.md` —
neither is in the built bundle — so the deployed app output stays byte-identical to the QA'd `a5bc922` build.)*

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
