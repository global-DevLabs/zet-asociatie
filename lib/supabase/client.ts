import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr";

// Singleton client instance
let browserClient: ReturnType<typeof createSupabaseBrowserClient> | null = null;

export function createBrowserClient() {
  if (browserClient) {
    return browserClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      `Missing Supabase environment variables. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.`
    );
  }

  browserClient = createSupabaseBrowserClient(url, anonKey);
  return browserClient;
}

// Alias for backward compatibility
export const createClient = createBrowserClient;
export const getSupabaseClient = createBrowserClient;
