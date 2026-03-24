import { createClient, SupabaseClient } from '@supabase/supabase-js'

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(env: { SUPABASE_URL: string; SUPABASE_ANON_KEY: string }) {
  if (!supabaseInstance) {
    supabaseInstance = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  }
  return supabaseInstance;
}

export function getSupabaseWithAuth(env: { SUPABASE_URL: string; SUPABASE_ANON_KEY: string }, token: string) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });
}
