import { useState } from "react";
import { cn } from "../../lib/cn.js";
import { Icon } from "../ui/Icon.jsx";
import { useSignedImageUrl } from "../../lib/storageImage.js";

/**
 * A content image that fails quietly.
 *
 * The old version fell back to `assets/club-logo.png` — a 1 MB file shipped so
 * that a broken news thumbnail could show the club logo, which read as "this
 * post is about the club" rather than "this image is missing". A neutral tile
 * is more honest and costs nothing.
 *
 * For member photos use `<Avatar>` instead: it falls back to initials, which
 * still identifies the person.
 */
export function SafeImage({
  src,
  bucket = "attachments",
  alt = "",
  className,
  wrapperClassName,
  ratio = "16 / 9",
  icon = "image",
  ...rest
}) {
  // News/todo images are private-bucket paths; resolve to a signed URL. Legacy
  // full URLs and blob previews pass straight through.
  const resolvedSrc = useSignedImageUrl(src, bucket);

  // Tracks the url that failed rather than a boolean, so replacing the source
  // gets a fresh attempt without an effect to reset the flag.
  const [failed, setFailed] = useState(null);

  if (!resolvedSrc || failed === resolvedSrc) {
    return (
      <div
        className={cn(
          "grid w-full place-items-center bg-surface-2 text-ink-subtle",
          wrapperClassName,
          className
        )}
        style={{ aspectRatio: ratio }}
        // A decorative image (alt="") that fails to load must stay silent — the
        // old fallback labelled every broken decorative tile "Image
        // unavailable". Only an informative image (real alt) exposes a label.
        {...(alt
          ? { role: "img", "aria-label": alt }
          : { "aria-hidden": "true" })}
      >
        <Icon name={icon} size={22} />
      </div>
    );
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={cn("w-full object-cover", className)}
      // The same ratio the fallback tile reserves, so the page does not jump
      // when a lazily-loaded image arrives. An explicit height class still
      // wins — a definite height makes `aspect-ratio` moot.
      style={{ aspectRatio: ratio }}
      onError={() => setFailed(resolvedSrc)}
      {...rest}
    />
  );
}

export default SafeImage;
