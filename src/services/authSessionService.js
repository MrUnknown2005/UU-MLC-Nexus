import { supabase } from "../lib/supabaseClient";

export async function getCurrentSession() {
  return supabase.auth.getSession();
}

export function subscribeToAuthState(onAuthStateChange) {
  return supabase.auth.onAuthStateChange(onAuthStateChange);
}

export async function getCurrentProfile(userId) {
  return supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
}

export async function signOut() {
  return supabase.auth.signOut();
}

export default {
  getCurrentSession,
  subscribeToAuthState,
  getCurrentProfile,
  signOut,
};
