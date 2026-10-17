import { createBrowserClient } from "@supabase/ssr";
import { isSupabaseConfigured } from "./config";

// ponytail: Browser client initialized with public URL & Anon Key only. No service role key is ever exposed to client.
export function getBrowserClient() {
  if (!isSupabaseConfigured()) return null;

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
