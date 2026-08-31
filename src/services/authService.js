import { supabase } from "../lib/supabaseClient";

export function signInWithPassword(email, password) {
  return supabase.auth.signInWithPassword({ email, password });
}

export function signUp({ email, password, fullName, nickname }) {
  return supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        nickname: nickname || null,
      },
    },
  });
}

/**
 * Sends the "reset my password" email.
 *
 * `redirectTo` points back at this deployment's origin, so the link works in
 * local development and in production without a build-time constant. Supabase
 * still requires the origin to be listed under Authentication → URL
 * Configuration; an unlisted origin silently falls back to the site URL.
 */
export function requestPasswordReset(email) {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin,
  });
}

/**
 * Sets a new password for the member the recovery link signed in.
 */
export function updatePassword(password) {
  return supabase.auth.updateUser({ password });
}

export default {
  signInWithPassword,
  signUp,
  requestPasswordReset,
  updatePassword,
};
