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

export default {
  signInWithPassword,
  signUp,
};
