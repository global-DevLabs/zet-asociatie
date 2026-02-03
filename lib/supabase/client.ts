import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr";

// Singleton client instance
let browserClient: ReturnType<typeof createSupabaseBrowserClient> | null = null;

export function createBrowserClient() {
  // Return existing client if already initialized
  if (browserClient) {
    return browserClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // During build/SSR, if env vars are missing, return a dummy client
  // This prevents build failures while still working at runtime
  if (!url || !anonKey) {
    // Only throw in browser environment where we expect vars to be available
    if (typeof window !== 'undefined') {
      throw new Error(
        `Missing Supabase environment variables. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.`
      );
    }
    // Return a dummy client for SSR/build (won't be used as pages are dynamic)
    return createSupabaseBrowserClient(
      'https://placeholder.supabase.co',
      'placeholder-anon-key'
    );
  }

  browserClient = createSupabaseBrowserClient(url, anonKey);
  return browserClient;
}

// Alias for backward compatibility
export const createClient = createBrowserClient;
export const getSupabaseClient = createBrowserClient;
