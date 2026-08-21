import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. " +
      "VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set at build time. " +
      "Locally: copy .env.example to .env and fill in your Supabase project's URL and anon key, then restart the dev server. " +
      "On a host (Vercel/Netlify/etc.): add both variables in the project's environment variable settings and trigger a new deploy, since Vite only reads them at build time."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);