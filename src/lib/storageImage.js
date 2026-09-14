import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

/**
 * Resolving a stored image value to something an `<img src>` can use.
 *
 * The storage buckets are private, so a stored object *path* has to be exchanged
 * for a short-lived signed URL before it can be shown. Three kinds of value flow
 * through here and only one of them needs signing:
 *
 *   - a storage path        (`news/<id>/<uuid>.jpg`, `<id>/avatar?v=…`) → sign it
 *   - a full http(s) URL    (legacy rows from when buckets were public)  → use as-is
 *   - a blob:/data: URL     (a local preview while a file is being chosen) → use as-is
 *
 * Anything carrying a scheme is passed through untouched, which is what lets the
 * app keep working through the migration: rows still holding public URLs render
 * fine until they are rewritten to paths, and file previews never hit the network.
 */
const DIRECT_URL = /^(https?:|blob:|data:)/i;

export function isDirectUrl(value) {
  return typeof value === "string" && DIRECT_URL.test(value);
}

/**
 * Best-effort deletion of a stored object, given the value we persisted for it
 * (a bucket path like `news/<id>/<uuid>.jpg` or `<id>/avatar?v=…`). This is what
 * stops Storage objects leaking when the row that referenced them is deleted or
 * its image is replaced.
 *
 * Only a bare path is removable: a legacy `http(s):`/`blob:`/`data:` value has no
 * object key we can target, so it is skipped (the M-2b migration already rewrote
 * the public-URL rows to paths, and a `blob:` preview was never uploaded). The
 * `?v=` cache-bust marker is stripped to recover the real key. Errors are logged
 * and swallowed on purpose — a missing or already-gone object must never block
 * the delete/replace it trails; a leaked file is recoverable, a blocked user
 * action is not.
 */
export async function removeStoredObject(bucket, value) {
  if (!value || isDirectUrl(value)) return;
  const path = value.split("?")[0];
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) {
    console.error(`Storage cleanup failed for ${bucket}/${path}:`, error);
  }
}

// Signed URLs are worth reusing within a session: the same member's avatar shows
// up in several lists at once, and a remounted card should not re-sign. Keyed on
// the full stored value (including any `?v=` cache-bust marker) so a replaced
// picture — which changes that value — misses the cache and signs afresh.
const signedUrlCache = new Map();

// Bounded so a long session that scrolls past many distinct images can't grow
// the map without limit. A Map preserves insertion order, so the oldest entry
// is the first key — and because a live entry is re-inserted (delete-then-set)
// on every re-sign, anything still on screen keeps moving to the newest end and
// only genuinely idle keys age out. (LOW #1)
const MAX_CACHE_ENTRIES = 200;

// Re-sign a minute before the token actually lapses, so an image never blinks
// out mid-view on a long-open tab.
const EXPIRY_BUFFER_S = 60;

// Fire the re-sign this long BEFORE the cached URL is due to expire, so the
// still-fresh cached URL keeps backing the image across the (sub-second) re-sign
// round-trip — `cachedUrl()` never has to return null. Floored so a
// pathologically short expiresIn can't turn re-signing into a hot loop.
const RESIGN_LEAD_MS = 5000;
const MIN_RESIGN_DELAY_MS = 30000;

// Write through the cap: prune anything already expired, re-insert this key at
// the newest end (delete-then-set), then evict the oldest if still over budget.
function cacheSet(cacheKey, entry) {
  const now = Date.now();
  for (const [key, value] of signedUrlCache) {
    if (value.expiresAt <= now) signedUrlCache.delete(key);
  }
  signedUrlCache.delete(cacheKey);
  signedUrlCache.set(cacheKey, entry);
  if (signedUrlCache.size > MAX_CACHE_ENTRIES) {
    signedUrlCache.delete(signedUrlCache.keys().next().value);
  }
}

function cachedUrl(cacheKey) {
  if (!cacheKey) return null;
  const hit = signedUrlCache.get(cacheKey);
  if (hit && hit.expiresAt > Date.now()) return hit.url;
  return null;
}

/**
 * @param value    the stored value (path, full URL, blob URL, or empty)
 * @param bucket   storage bucket to sign paths against ("avatars" | "attachments")
 * @param expiresIn signed-URL lifetime in seconds
 * @returns a URL ready for `<img src>`, or "" while signing / on failure
 */
export function useSignedImageUrl(value, bucket, expiresIn = 3600) {
  const needsSigning = Boolean(value) && !isDirectUrl(value);
  const cacheKey = needsSigning ? `${bucket}:${value}` : null;

  // Only the async signing result lives in state — tagged with the key it was
  // signed for, so a result that lands after `value` has changed is ignored
  // rather than shown against the wrong image.
  const [signed, setSigned] = useState(null);

  useEffect(() => {
    if (!cacheKey) return undefined;

    // The cache-bust marker (`path?v=…`) is not part of the object key — it only
    // exists to change `value`. Strip it before signing; the fresh token is the
    // real cache-buster.
    const path = value.split("?")[0];

    let active = true;
    let resignTimer;

    const scheduleResign = (delayMs) => {
      resignTimer = setTimeout(sign, Math.max(delayMs, MIN_RESIGN_DELAY_MS));
    };

    // Sign, cache the result, and schedule the NEXT signing to land just before
    // the cached URL lapses — so an image on a long-open tab is re-signed instead
    // of 404ing when its token silently expires. Cache hits are read at render
    // time via cachedUrl(); setSigned here is the async state change that makes
    // the component re-render once the first URL is ready. (M-4)
    function sign() {
      supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn)
        .then(({ data, error }) => {
          if (!active || error || !data?.signedUrl) return;
          const freshForMs = Math.max(expiresIn - EXPIRY_BUFFER_S, 0) * 1000;
          cacheSet(cacheKey, {
            url: data.signedUrl,
            expiresAt: Date.now() + freshForMs,
          });
          setSigned({ key: cacheKey, url: data.signedUrl });
          scheduleResign(freshForMs - RESIGN_LEAD_MS);
        })
        .catch(() => {});
    }

    // A still-fresh cached URL (another card already signed this same object) is
    // shown via cachedUrl() at render; here we only arm the re-sign so it stays
    // fresh. Otherwise sign now.
    const hit = signedUrlCache.get(cacheKey);
    if (hit && hit.expiresAt > Date.now()) {
      scheduleResign(hit.expiresAt - Date.now() - RESIGN_LEAD_MS);
    } else {
      sign();
    }

    return () => {
      active = false;
      if (resignTimer) clearTimeout(resignTimer);
    };
  }, [cacheKey, value, bucket, expiresIn]);

  // Derive the URL to show entirely from the current value, so it can never lag
  // behind a change: empty → nothing; a scheme'd URL → itself; a path → its
  // cached or freshly-signed URL, or "" while the first sign is in flight.
  if (!value) return "";
  if (isDirectUrl(value)) return value;
  return cachedUrl(cacheKey) ?? (signed?.key === cacheKey ? signed.url : "");
}
