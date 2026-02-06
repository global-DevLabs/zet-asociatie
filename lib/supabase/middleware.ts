import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // Tauri app: auth is local (SQLite + localStorage). Skip Supabase auth check.
  if (process.env.TAURI_ENV_PLATFORM) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Update cookies on the request for Server Components
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Create new response with updated request
          supabaseResponse = NextResponse.next({
            request,
          });
          // Set cookies on the response for the browser
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // getUser() refreshes the session and validates the token
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = ["/login"];
  const isPublicRoute = publicRoutes.some(
    route => pathname === route || pathname.startsWith(`${route}/`)
  );

  // Auth callback route should always be accessible
  if (pathname.startsWith("/auth/callback")) {
    return supabaseResponse;
  }

  // If user is not authenticated and trying to access protected route
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  // If user is authenticated and trying to access login page, redirect to home
  if (user && pathname === "/login") {
    const callbackUrl = request.nextUrl.searchParams.get("callbackUrl");
    const url = request.nextUrl.clone();
    url.pathname = callbackUrl || "/";
    url.searchParams.delete("callbackUrl");
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
