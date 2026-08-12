import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client, built with the secret key.
 *
 * The `server-only` import above turns any accidental client-component import of
 * this module into a build error, which is what keeps the key out of the browser
 * bundle. The key value is passed straight through to `createClient`: both the
 * new `sb_secret_…` format and legacy JWT service keys work identically.
 */

export const STORAGE_BUCKET = "visions";

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY must be set");
  }

  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
