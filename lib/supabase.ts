// server-only supabase client for media uploads.
// prefers the service role key (full storage access), falls back to the anon
// key when it is not set yet. returns null when the config is missing.
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export function supabaseServer(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}
