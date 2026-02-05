import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Initialize database on first request
let dbInitialized = false;

export async function middleware(request: NextRequest) {
  // Initialize database once on first request
  if (!dbInitialized) {
    try {
      const { initializeDatabase } = await import("@/lib/db");
      initializeDatabase();
      dbInitialized = true;
    } catch (error) {
      console.error("Failed to initialize database:", error);
    }
  }

  // Update session (handles authentication)
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
