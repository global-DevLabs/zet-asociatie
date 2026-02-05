import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "supersecretkey-change-in-production"
);

/**
 * Middleware to handle local authentication
 * Verifies JWT tokens in cookies instead of Supabase session
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // Get the JWT token from cookies
  const token = request.cookies.get("auth_token")?.value;

  let user = null;

  // Verify JWT token if present
  if (token) {
    try {
      const verified = await jwtVerify(token, JWT_SECRET);
      user = verified.payload as any;
    } catch (err) {
      // Token is invalid, clear it
      supabaseResponse.cookies.delete("auth_token");
    }
  }

  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = ["/login"];
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
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
