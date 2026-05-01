import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Env } from "../env.js";

let cachedClient: SupabaseClient | null = null;

export function getSupabase(env: Env): SupabaseClient {
  if (cachedClient) return cachedClient;
  cachedClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  return cachedClient;
}
