import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth/jwt";

const publicPaths = ["/login"];
const apiAuthPaths = ["/api/auth/login", "/api/auth/register"];

function isPublic(pathname: string): boolean {
  if (pathname.startsWith("/api/")) {
    return apiAuthPaths.some((p) => pathname === p || pathname.startsWith(p + "/"));
  }
  return publicPaths.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

/** Simple JWT shape check (middleware runs on Edge; full verify is in API). */
function looksLikeJwt(value: string): boolean {
  return value.split(".").length === 3 && value.length > 20;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (token && looksLikeJwt(token) && pathname === "/login") {
      const url = request.nextUrl.clone();
      url.pathname = request.nextUrl.searchParams.get("callbackUrl") || "/";
      url.searchParams.delete("callbackUrl");
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token || !looksLikeJwt(token)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
