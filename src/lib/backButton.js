import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";

/**
 * Android hardware/gesture "back" dispatcher.
 *
 * This app is a single-page state machine with no browser history to pop, so
 * the native back button would otherwise always exit the app. Instead we keep a
 * priority-ordered registry of handlers; on each back press we call them from
 * highest priority down and stop at the first that reports it consumed the
 * press. If none does, we exit the app — the correct behaviour at a top-level
 * screen.
 *
 * No-op on the web (Capacitor.isNativePlatform() === false): the listener is
 * never attached, so nothing here affects the browser build.
 */
const handlers = new Set();
let wired = false;

function ensureWired() {
  if (wired || !Capacitor.isNativePlatform()) return;
  wired = true;
  // The returned listener handle is never removed on purpose — the dispatcher
  // lives for the whole app lifetime.
  App.addListener("backButton", () => {
    const ordered = [...handlers].sort((a, b) => b.priority - a.priority);
    for (const entry of ordered) {
      try {
        if (entry.handler()) return;
      } catch (err) {
        console.error("back-button handler threw:", err);
      }
    }
    App.exitApp();
  });
}

/**
 * Register a back-press handler. `handler` returns true when it handled (and so
 * consumed) the press. Higher `priority` runs first. Returns an unregister fn.
 */
export function registerBackHandler(handler, priority = 0) {
  ensureWired();
  const entry = { handler, priority };
  handlers.add(entry);
  return () => {
    handlers.delete(entry);
  };
}

export function isNativePlatform() {
  return Capacitor.isNativePlatform();
}
