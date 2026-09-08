# Supabase migrations — how this folder works

This project applies SQL to Supabase **manually** (MCP / the Supabase SQL editor),
not through `supabase db push`. So think of these files as the *authoritative record*
of the schema, not an auto-run chain.

## The two kinds of file here

**1 · The baseline — `00000000000000_baseline_schema.sql`**
A single, standalone, idempotent snapshot of the **entire live `public` schema**
(tables, constraints, indexes, all functions, triggers, RLS policies, storage
buckets + policies, and the realtime publication) as of **2026-09-08**. It was
reconstructed by reading the live Postgres catalogs.

- To **rebuild a fresh database from scratch**: run *this file alone*. It creates
  everything in dependency order and is safe to re-run (`create … if not exists`,
  `create or replace`, `drop policy if exists … / create`, `on conflict …`).
- It is a **superset** of every incremental migration below — do **not** also
  replay the incrementals onto a fresh DB, or they'll collide with objects the
  baseline already created.
- Running it against the **existing** project is a safe near-no-op.
- ⚠️ It restores **schema only**. Reference-data rows (`role_definitions`,
  `permissions`, `role_permissions`) are seeded separately and are required for
  the app to function — seed them after running the baseline.
- ⚠️ It assumes a stock Supabase project (the `auth`/`storage` schemas, the
  `anon`/`authenticated`/`service_role` roles, the `supabase_realtime`
  publication, and the default extensions already exist).

**2 · The incremental migrations — the timestamped files**
The change-by-change history that was applied to the live project over time
(e.g. `20260908013032_phase4_db_hardening.sql`). They document *how* the schema
got to its current state and match the live project's migration history. For a
fresh rebuild they are redundant with the baseline; keep them for provenance.

## Why the baseline exists

Historically the repo did not contain the DDL for the pre-Aug-2022 objects, the
realtime publication, or a couple of later RPCs, so it could **not** rebuild the
database from scratch (the "migration drift" landmine tracked in Phase 4). The
baseline closes that gap: the repo can now recreate the full schema on a new
Supabase project from one file.

## If you change the schema later

1. Write a new timestamped incremental (`YYYYMMDDHHMMSS_short_description.sql`)
   and apply it to the live project.
2. Periodically **regenerate the baseline** so it keeps reflecting live state
   (re-dump from the catalogs, or fold the new incrementals in by hand).

Keeping the baseline current is what prevents drift from creeping back.
