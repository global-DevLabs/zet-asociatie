import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "supersecretkey-change-in-production"
);

/**
 * GET /api/auth/user
 * Get the currently authenticated user (from JWT token)
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json(
        { user: null },
        { status: 200 }
      );
    }

    try {
      const verified = await jwtVerify(token, JWT_SECRET);
      return NextResponse.json({ user: verified.payload });
    } catch (err) {
      return NextResponse.json(
        { user: null },
        { status: 200 }
      );
    }
  } catch (error: any) {
    console.error("Auth check error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
