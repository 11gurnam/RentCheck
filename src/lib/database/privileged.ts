import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getPublicEnvironment } from "@/lib/environment";
export function createMediaClient() {
  const env = getPublicEnvironment();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!env || !key) throw new Error("Media backend not configured");
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
