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

/**
 * Changes the password for the member who is already signed in.
 *
 * A Supabase session can call updateUser({ password }) without proving the old
 * password, so on an unattended, already-signed-in device anyone could quietly
 * take over the account. We re-verify the current password with a sign-in check
 * first, and only then set the new one.
 *
 * Returns { error } — a friendly message when the current password is wrong,
 * and whatever updateUser reports for anything else. On success, { error: null }.
 */
export async function changePassword({ currentPassword, newPassword }) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return {
      error: { message: "You need to be signed in to change your password." },
    };
  }

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (verifyError) {
    return {
      error: {
        message:
          verifyError.message === "Invalid login credentials"
            ? "Your current password is incorrect."
            : verifyError.message,
      },
    };
  }

  return supabase.auth.updateUser({ password: newPassword });
}

/**
 * Permanently deletes the signed-in member's own account.
 *
 * Same reasoning as changePassword: a live Supabase session can call privileged
 * RPCs on its own, and deletion is irreversible, so we re-verify the current
 * password first to be sure the person at the keyboard is the account owner and
 * not someone who found an unlocked device.
 *
 * The erasure itself happens server-side in the `delete_own_account` RPC
 * (SECURITY DEFINER): it sends the farewell email via Resend, removes the
 * member's owned rows, records the deletion in the audit log, then deletes the
 * auth user. We finally sign the now-deleted session out so the app returns to
 * the logged-out screen — a signOut failure is ignored, the account is gone
 * either way.
 *
 * Returns { error } — a friendly message when the password is wrong, or
 * whatever the RPC reports. On success, { error: null }.
 */
export async function deleteOwnAccount({ currentPassword }) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return {
      error: { message: "You need to be signed in to delete your account." },
    };
  }

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (verifyError) {
    return {
      error: {
        message:
          verifyError.message === "Invalid login credentials"
            ? "Your password is incorrect."
            : verifyError.message,
      },
    };
  }

  const { error: rpcError } = await supabase.rpc("delete_own_account");

  if (rpcError) {
    return { error: rpcError };
  }

  await supabase.auth.signOut();

  return { error: null };
}

export default {
  signInWithPassword,
  signUp,
  requestPasswordReset,
  updatePassword,
  changePassword,
  deleteOwnAccount,
};
