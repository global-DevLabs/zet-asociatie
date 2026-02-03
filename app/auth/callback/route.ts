import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const cookieStore = await cookies();

    // Track cookies that need to be set on the response
    const cookiesToSet: { name: string; value: string; options: any }[] = [];

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookies) {
            // Collect cookies to set on the redirect response
            cookiesToSet.push(...cookies);
            // Also try to set via cookieStore for server component compatibility
            cookies.forEach(({ name, value, options }) => {
              try {
                cookieStore.set(name, value, options);
              } catch {
                // Ignore errors in route handlers
              }
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Create redirect response and manually set the auth cookies
      const response = NextResponse.redirect(`${origin}${next}`);

      // Apply all cookies to the redirect response
      cookiesToSet.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options);
      });

      return response;
    }
  }

  // If there's an error or no code, redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
