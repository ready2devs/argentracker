import { createClient } from "@supabase/supabase-js";

// Browser client — usa la anon key (safe to expose)
export function createBrowserClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
