import { NextRequest } from "next/server";
import { verifyJwtToken, type JwtPayload } from "./local-auth";

export const AUTH_COOKIE_NAME = "auth-token";

/**
 * Read JWT from cookie or Authorization header (Bearer).
 */
export function getJwtFromRequest(request: NextRequest): JwtPayload | null {
  const cookie = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (cookie) {
    const payload = verifyJwtToken(cookie);
    if (payload) return payload;
  }
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (token) {
    const payload = verifyJwtToken(token);
    if (payload) return payload;
  }
  return null;
}
