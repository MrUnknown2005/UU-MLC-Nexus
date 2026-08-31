/* =============================================================
   Theme store
   -------------------------------------------------------------
   Three preferences — "system", "light", "dark" — persisted to
   localStorage and reflected onto <html data-theme>. tokens.css
   does the rest: every colour resolves through a custom property,
   so flipping the attribute repaints the product with no React
   re-render of anything but the toggle itself.

   A matching inline script in index.html applies the stored value
   before first paint. Without it, a member who picked light would
   see a dark flash on every load.
   ============================================================= */

const STORAGE_KEY = "uu-mlc-theme";
const VALID = new Set(["system", "light", "dark"]);

const listeners = new Set();
let current = readStored();

function readStored() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return VALID.has(stored) ? stored : "system";
  } catch {
    // Private-mode Safari throws on access rather than returning null.
    return "system";
  }
}

function apply(preference) {
  const root = document.documentElement;
  if (preference === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", preference);
  }
}

function emit() {
  for (const listener of listeners) listener();
}

/** The stored preference: "system" | "light" | "dark". */
export function getTheme() {
  return current;
}

/** What the member is actually looking at right now. */
export function getResolvedTheme() {
  if (current !== "system") return current;
  return window.matchMedia?.("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

export function setTheme(preference) {
  const next = VALID.has(preference) ? preference : "system";
  if (next === current) return;

  current = next;
  apply(next);

  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Preference simply will not survive a reload. Not worth surfacing.
  }

  emit();
}

/** Cycle order matches the toggle's icon order: system → light → dark. */
export function cycleTheme() {
  const order = ["system", "light", "dark"];
  setTheme(order[(order.indexOf(current) + 1) % order.length]);
}

export function subscribeToTheme(listener) {
  listeners.add(listener);

  // A "system" preference still changes appearance when the OS flips.
  const media = window.matchMedia?.("(prefers-color-scheme: light)");
  const onMediaChange = () => {
    if (current === "system") emit();
  };
  media?.addEventListener("change", onMediaChange);

  return () => {
    listeners.delete(listener);
    media?.removeEventListener("change", onMediaChange);
  };
}

/** Re-assert the stored preference once the app owns the document. */
export function initTheme() {
  apply(current);
}
