import { createClient } from "@supabase/supabase-js";

/**
 * ADMIN CLIENT - Server-only Supabase client with service role key
 * 
 * WARNING: This client bypasses Row Level Security (RLS) policies.
 * Only use this in secure server-side contexts (API routes, server actions).
 * NEVER expose this client or the service role key to the browser.
 * 
 * Use cases:
 * - Creating new auth users via admin API
 * - Managing user roles and permissions
 * - Performing admin operations that require elevated privileges
 */

let adminClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdmin() {
  // Return existing client if already initialized
  if (adminClient) {
    return adminClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase environment variables. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set."
    );
  }

  adminClient = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminClient;
}

// Alias for convenience
export const supabaseAdmin = getSupabaseAdmin;
