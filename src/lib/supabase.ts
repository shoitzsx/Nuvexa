import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/supabase";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? "";

export const isSupabaseConfigured =
  supabaseUrl.length > 0 &&
  supabaseAnonKey.length > 0 &&
  supabaseUrl !== "https://seu-projeto.supabase.co";

export const supabase = createClient<Database>(
  isSupabaseConfigured ? supabaseUrl : "https://example.supabase.co",
  isSupabaseConfigured ? supabaseAnonKey : "missing-anon-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);

export function clearSupabaseAuthStorage() {
  if (typeof window === "undefined") {
    return;
  }

  if (isSupabaseConfigured) {
    const projectReference = new URL(supabaseUrl).hostname.split(".")[0];
    window.localStorage.removeItem(`sb-${projectReference}-auth-token`);
    window.localStorage.removeItem(`sb-${projectReference}-auth-token-code-verifier`);
  }

  Object.keys(window.localStorage)
    .filter((key) => key.startsWith("sb-") && key.includes("-auth-token"))
    .forEach((key) => window.localStorage.removeItem(key));
}
