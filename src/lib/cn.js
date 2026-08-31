/**
 * Conditional className joiner.
 *
 * Accepts strings, arrays and objects; drops anything falsy. Deliberately
 * tiny — we do not need Tailwind conflict resolution because components own
 * their base classes and callers only ever append.
 *
 *   cn("px-3", isActive && "bg-brand", { "opacity-50": disabled })
 */
export function cn(...parts) {
  const out = [];

  for (const part of parts) {
    if (!part) continue;

    if (typeof part === "string") {
      out.push(part);
    } else if (Array.isArray(part)) {
      const nested = cn(...part);
      if (nested) out.push(nested);
    } else if (typeof part === "object") {
      for (const [key, value] of Object.entries(part)) {
        if (value) out.push(key);
      }
    }
  }

  return out.join(" ");
}

export default cn;
