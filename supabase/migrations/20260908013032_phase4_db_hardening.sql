-- Phase 4 — DB / Supabase / RLS hardening
-- ============================================================================
-- Findings-first audit (2026-09-08) over the live project. The server-side
-- authz model was found solid (RLS on all tables; mutation RPCs check the
-- caller role; column-level BEFORE UPDATE triggers). This migration lands the
-- drift/hardening fixes only. See PLAN.md "PHASE 4" for the full ledger.
--
-- Applied to project scgqhsxfzqvsqiugnceg on 2026-09-08 as migration
-- 20260908013032 (via the Supabase migration runner, which wraps its own
-- transaction — hence no explicit begin/commit around the DDL block below).
--
-- Scope (all verified safe against current data):
--   H-1  strip Resend farewell email from delete_own_account(); drop pg_net
--   M-1  award_points / reset_member_points: server-side self-target block + cap
--   L-1  revoke anon EXECUTE on three later-added RPCs
--   L-2  profiles.role -> FK to role_definitions(role_key)
--   L-3  align protect_profile_self_updates with the manage_members RLS policy
--   L-4  CHECK constraints (points >= 0; text length caps)
--   L-5  drop duplicate avatars storage policies
--   M-2a storage buckets: MIME allowlist (no SVG) + 8 MB cap  [appendix, non-tx]
--
-- Deferred (need coordinated app-code changes / dashboard — NOT here):
--   M-2b buckets public -> private + signed URLs (with the legal-checklist work)
--   L-6  enable leaked-password protection (Auth dashboard toggle)
-- ============================================================================

-- H-1 · delete_own_account(): remove the Resend farewell-email path entirely.
-- The email code contradicted the locked "farewell email dropped" decision and
-- was firing on every deletion. This restores a clean pure-delete: capture
-- identity, fix up NO ACTION foreign keys, delete the auth user (profiles
-- cascade). No Vault read, no pg_net, no email.
create or replace function public.delete_own_account()
  returns void
  language plpgsql
  security definer
  set search_path to 'public', 'auth'
as $function$
declare
  v_user_id uuid;
begin
  -- 1. Identify the caller.
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'You must be signed in to delete your account.';
  end if;

  -- 2. Fix up foreign keys that use NO ACTION so the delete can proceed.
  --    Keep the club's shared content; just detach the departing member.
  update public.news
     set published_by = null
   where published_by = v_user_id;

  update public.point_history
     set awarded_by = null
   where awarded_by = v_user_id;

  -- reset_by is NOT NULL + NO ACTION, so these rows must go first.
  delete from public.point_reset_history
   where reset_by = v_user_id;

  -- 3. Delete the auth user. profiles.id references auth.users(id) ON DELETE
  --    CASCADE, so the profile and other cascading rows go with it.
  delete from auth.users
   where id = v_user_id;

  if not found then
    raise exception 'Account deletion failed: user was not found.';
  end if;
end;
$function$;

-- pg_net existed solely for the Resend call above. Nothing else in public uses
-- net.http_*, so remove the extension to shrink the surface.
drop extension if exists pg_net;

-- M-1 · award_points(): the RPC is the authoritative boundary (the client cap
-- MAX_POINT_ADJUSTMENT = 100000 is only UX). Add a server-side self-target
-- block and magnitude cap that mirror the client.
create or replace function public.award_points(p_member_id uuid, p_points integer, p_reason text)
  returns void
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
declare
  caller_role text;
  target_role text;
  current_points integer;
  new_points integer;
begin
  caller_role := public.current_user_role();

  -- Only Executives and above can adjust points.
  if caller_role not in ('executive', 'administrator', 'head_admin') then
    raise exception 'You do not have permission to adjust points.';
  end if;

  -- No self-dealing: you cannot adjust your own points.
  if p_member_id = auth.uid() then
    raise exception 'You cannot adjust your own points.';
  end if;

  if p_points = 0 then
    raise exception 'Point adjustment cannot be zero.';
  end if;

  -- Magnitude cap (mirrors the client MAX_POINT_ADJUSTMENT).
  if abs(p_points) > 100000 then
    raise exception 'Point adjustment is too large.';
  end if;

  if trim(p_reason) = '' then
    raise exception 'A reason is required.';
  end if;

  select role, points
    into target_role, current_points
    from public.profiles
   where id = p_member_id;

  if target_role is null then
    raise exception 'Member was not found.';
  end if;

  if target_role = 'guest' then
    raise exception 'Guests cannot receive point adjustments.';
  end if;

  new_points := current_points + p_points;

  if new_points < 0 then
    raise exception 'This adjustment would reduce the member below zero points.';
  end if;

  insert into public.point_history (member_id, points, reason, awarded_by)
  values (p_member_id, p_points, p_reason, auth.uid());

  update public.profiles
     set points = new_points
   where id = p_member_id;
end;
$function$;

-- reset_member_points(): add the same self-target guard.
create or replace function public.reset_member_points(p_member_id uuid)
  returns void
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
begin
  if public.current_user_role() not in ('administrator', 'head_admin') then
    raise exception 'You do not have permission to reset points.';
  end if;

  if p_member_id = auth.uid() then
    raise exception 'You cannot reset your own points.';
  end if;

  if not exists (select 1 from public.profiles where id = p_member_id) then
    raise exception 'Member was not found.';
  end if;

  if exists (
    select 1 from public.profiles where id = p_member_id and role = 'guest'
  ) then
    raise exception 'Guests do not have points to reset.';
  end if;

  update public.profiles
     set points = 0
   where id = p_member_id;
end;
$function$;

-- L-1 · Revoke anon EXECUTE on RPCs added after the original grant-removal
-- migration. Functionally safe (auth.uid() is null for anon) but needless
-- surface. authenticated keeps EXECUTE.
revoke execute on function public.delete_own_account()      from anon;
revoke execute on function public.delete_own_notifications() from anon;
revoke execute on function public.delete_all_notifications() from anon;

-- L-2 · profiles.role integrity: FK to role_definitions(role_key). All five
-- current roles exist there, so this validates cleanly.
alter table public.profiles
  add constraint profiles_role_fkey
  foreign key (role) references public.role_definitions(role_key);

-- L-3 · Align the self-update trigger with the "Permission roles can update
-- other profiles" RLS policy. The policy authorises has_permission('manage_
-- members'); the trigger hardcoded administrator/head_admin, so delegating
-- manage_members to any other role would fail closed with a raw exception.
-- Gate on the permission instead, which today resolves to the same people.
-- (Column-level role protection stays with protect_profile_role_changes.)
create or replace function public.protect_profile_self_updates()
  returns trigger
  language plpgsql
  security definer
  set search_path to 'public'
as $function$
begin
  if new.id = auth.uid() then
    if new.role is distinct from old.role
       or new.points is distinct from old.points
       or new.is_active is distinct from old.is_active
       or new.created_at is distinct from old.created_at then
      raise exception 'You cannot change your role, points, account status, or creation date.';
    end if;
    return new;
  end if;

  if not public.has_permission('manage_members') then
    raise exception 'You do not have permission to modify this profile.';
  end if;

  return new;
end;
$function$;

-- L-4 · CHECK constraints as a server-side safety net (the client maxLength is
-- bypassable). Caps are generous supersets of the app's input limits so no
-- current or realistic row is rejected. Verified against live max lengths.
alter table public.profiles
  add constraint profiles_points_nonneg check (points >= 0),
  add constraint profiles_full_name_len check (full_name is null or char_length(full_name) <= 120),
  add constraint profiles_nickname_len  check (nickname  is null or char_length(nickname)  <= 80),
  add constraint profiles_bio_len       check (bio       is null or char_length(bio)       <= 2000);

alter table public.news
  add constraint news_title_len   check (char_length(title)   <= 300),
  add constraint news_content_len check (char_length(content) <= 20000);

alter table public.todos
  add constraint todos_title_len check (char_length(title) <= 300),
  add constraint todos_desc_len  check (description is null or char_length(description) <= 5000);

alter table public.point_history
  add constraint point_history_reason_len check (char_length(reason) <= 500);

-- L-5 · Drop duplicate avatars storage policies. Two INSERT and two UPDATE
-- policies express the same own-folder rule; keep one of each (the versions
-- with an explicit WITH CHECK) and drop the redundant pair.
drop policy if exists "Users can upload their own avatar" on storage.objects;
drop policy if exists "Users can update their own avatar" on storage.objects;

-- ============================================================================
-- APPENDIX — applied separately (not via the migration runner), recorded here
-- so this file is a complete, replayable account of the Phase 4 changes.
-- ============================================================================

-- M-2a · Storage bucket hardening (storage API tables, run outside the tx).
-- Allow common raster image types only — SVG is deliberately excluded
-- (stored-XSS vector; matches the Phase 3 client-side reject) — cap at 8 MB to
-- match uploadAttachment.js.
--   update storage.buckets
--      set allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif'],
--          file_size_limit    = 8388608  -- 8 MB
--    where id in ('avatars', 'attachments');

-- H-1 (cont.) · The 'resend_api_key' Vault secret was deleted separately — a
-- migration is the wrong place to destroy a credential:
--   delete from vault.secrets where name = 'resend_api_key';
