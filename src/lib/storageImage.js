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

// Re-sign a minute before the token actually lapses, so an image never blinks
// out mid-view on a long-open tab.
const EXPIRY_BUFFER_S = 60;

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
    // Passthrough values and cache hits are handled during render; nothing to do.
    if (!cacheKey || cachedUrl(cacheKey)) return;

    // The cache-bust marker (`path?v=…`) is not part of the object key — it only
    // exists to change `value` and re-run this effect. Strip it before signing;
    // the fresh token is the real cache-buster.
    const path = value.split("?")[0];

    let active = true;
    supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn)
      .then(({ data, error }) => {
        if (!active || error || !data?.signedUrl) return;
        signedUrlCache.set(cacheKey, {
          url: data.signedUrl,
          expiresAt: Date.now() + (expiresIn - EXPIRY_BUFFER_S) * 1000,
        });
        setSigned({ key: cacheKey, url: data.signedUrl });
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [cacheKey, value, bucket, expiresIn]);

  // Derive the URL to show entirely from the current value, so it can never lag
  // behind a change: empty → nothing; a scheme'd URL → itself; a path → its
  // cached or freshly-signed URL, or "" while the first sign is in flight.
  if (!value) return "";
  if (isDirectUrl(value)) return value;
  return cachedUrl(cacheKey) ?? (signed?.key === cacheKey ? signed.url : "");
}
