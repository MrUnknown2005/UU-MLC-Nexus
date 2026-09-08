-- Phase 4 · M-2b — private storage buckets + object-path references
--
-- Until now `avatars` and `attachments` were PUBLIC buckets and the app stored
-- the full public URL of each upload in profiles.avatar_url / news.image_url /
-- todos.image_url. A public bucket means anyone who holds — or guesses — an
-- object URL can read a member's photo or a task attachment with no account at
-- all. (The MIME/size hardening in 20260908013032 already closed the acute
-- stored-XSS path by banning SVG; this closes the anonymous-read path.)
--
-- This migration:
--   1. rewrites every stored full URL to a bare object *path*, and
--   2. flips both buckets to private.
--
-- On read, the client (src/lib/storageImage.js, via <Avatar> and <SafeImage>)
-- exchanges a path for a short-lived signed URL. The existing
-- "Everyone can view attachments" / "Users can view avatars" SELECT policies on
-- storage.objects (both `to authenticated`) are what authorise that signing, so
-- every logged-in member can still see every image while `anon` is locked out.
--
-- ORDER OF OPERATIONS (important):
--   Deploy the path-storing app code FIRST, then run this migration. If the
--   bucket is made private while old code (which reads full public URLs straight
--   into <img>) is still live, every image 404s; and if rows are rewritten to
--   paths while old code is live, old code renders raw paths as broken images.
--   The two statements below are ordered rewrite-then-close for the same reason.
--
-- Safe to re-run: the row rewrites only touch values that are still full URLs,
-- and the bucket flip is idempotent.

-- 1 · Rewrite stored public URLs -> object paths -------------------------------
-- Strips the  https://<host>/storage/v1/object/(public|sign)/<bucket>/  prefix,
-- leaving the object key — e.g.  <uuid>/avatar?v=1788…  or  news/<uuid>/<f>.jpg .
-- A leftover `?v=` cache-bust marker on avatars is harmless: the reader strips it
-- before signing. A value that does not match the prefix (e.g. some external
-- URL) is left unchanged and simply passes through the reader untouched.

update public.profiles
set avatar_url = regexp_replace(
      avatar_url,
      '^https?://[^/]+/storage/v1/object/(public|sign)/avatars/', '')
where avatar_url like 'http%';

update public.news
set image_url = regexp_replace(
      image_url,
      '^https?://[^/]+/storage/v1/object/(public|sign)/attachments/', '')
where image_url like 'http%';

update public.todos
set image_url = regexp_replace(
      image_url,
      '^https?://[^/]+/storage/v1/object/(public|sign)/attachments/', '')
where image_url like 'http%';

-- 2 · Close public read access -------------------------------------------------
update storage.buckets
set public = false
where id in ('avatars', 'attachments');
