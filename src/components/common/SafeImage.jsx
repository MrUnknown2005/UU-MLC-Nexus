import { useState } from "react";
import { cn } from "../../lib/cn.js";
import { Icon } from "../ui/Icon.jsx";

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
  alt = "",
  className,
  wrapperClassName,
  ratio = "16 / 9",
  icon = "image",
  ...rest
}) {
  // Tracks the url that failed rather than a boolean, so replacing the source
  // gets a fresh attempt without an effect to reset the flag.
  const [failed, setFailed] = useState(null);

  if (!src || failed === src) {
    return (
      <div
        className={cn(
          "grid w-full place-items-center bg-surface-2 text-ink-subtle",
          wrapperClassName,
          className
        )}
        style={{ aspectRatio: ratio }}
        role="img"
        aria-label={alt || "Image unavailable"}
      >
        <Icon name={icon} size={22} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={cn("w-full object-cover", className)}
      // The same ratio the fallback tile reserves, so the page does not jump
      // when a lazily-loaded image arrives. An explicit height class still
      // wins — a definite height makes `aspect-ratio` moot.
      style={{ aspectRatio: ratio }}
      onError={() => setFailed(src)}
      {...rest}
    />
  );
}

export default SafeImage;
