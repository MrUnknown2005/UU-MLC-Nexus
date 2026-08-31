import { useState } from "react";
import { cn } from "../../lib/cn.js";
import { accentFor, initials } from "../../lib/format.js";

const SIZES = {
  xs: { box: "h-6 w-6", text: "text-[0.625rem]" },
  sm: { box: "h-8 w-8", text: "text-[0.6875rem]" },
  md: { box: "h-10 w-10", text: "text-xs" },
  lg: { box: "h-14 w-14", text: "text-base" },
  xl: { box: "h-20 w-20", text: "text-xl" },
  "2xl": { box: "h-28 w-28", text: "text-3xl" },
};

// Written out rather than interpolated so Tailwind's scanner sees every class.
const ACCENTS = {
  brand: "bg-brand-soft text-brand-text",
  violet: "bg-violet-soft text-violet",
  info: "bg-info-soft text-info",
  success: "bg-success-soft text-success",
  warn: "bg-warn-soft text-warn",
  danger: "bg-danger-soft text-danger",
};

/**
 * Member avatar with a deterministic initials fallback.
 *
 * A broken or missing `avatar_url` renders the monogram instead of a torn
 * image icon, and the accent colour is derived from the member's id so the
 * same person is always the same colour across every screen.
 */
export function Avatar({
  src,
  name,
  fallbackName,
  seed,
  size = "md",
  ring = false,
  className,
  ...rest
}) {
  // The *url* that failed, not a boolean: a member who uploads a new photo
  // gets a fresh attempt without needing an effect to reset a flag.
  const [failedSrc, setFailedSrc] = useState(null);

  const dims = SIZES[size] ?? SIZES.md;
  const accent = ACCENTS[accentFor(seed ?? name ?? "")] ?? ACCENTS.brand;
  const showImage = Boolean(src) && failedSrc !== src;

  return (
    <span
      className={cn(
        "relative inline-grid shrink-0 place-items-center overflow-hidden",
        "rounded-full border border-line select-none",
        dims.box,
        !showImage && accent,
        ring && "ring-2 ring-brand ring-offset-2 ring-offset-canvas",
        className
      )}
      {...rest}
    >
      {showImage ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailedSrc(src)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span
          aria-hidden="true"
          className={cn("font-display font-bold tracking-tight", dims.text)}
        >
          {initials(name, fallbackName)}
        </span>
      )}
    </span>
  );
}

export default Avatar;
