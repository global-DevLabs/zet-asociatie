import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { authenticateUser, createUser } from "@/lib/auth-utils";
import { v4 as uuid } from "uuid";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "supersecretkey-change-in-production"
);

/**
 * POST /api/auth/login
 * Handle user login and create JWT token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      );
    }

    const result = authenticateUser(email, password);

    if (!result.success || !result.user) {
      return NextResponse.json(
        { error: result.error || "Invalid credentials" },
        { status: 401 }
      );
    }

    // Create JWT token
    const token = await new SignJWT(result.user)
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("24h")
      .sign(JWT_SECRET);

    // Create response with user
    const response = NextResponse.json({
      user: result.user,
      token,
    });

    // Set secure HTTP-only cookie
    response.cookies.set({
      name: "auth_token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60, // 24 hours
      sameSite: "lax",
    });

    return response;
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
