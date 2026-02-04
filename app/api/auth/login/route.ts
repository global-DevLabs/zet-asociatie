import { NextRequest, NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";
import { verifyPassword, issueJwt } from "@/lib/auth/local-auth";
import { AUTH_COOKIE_NAME } from "@/lib/auth/jwt";

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

    const { rows } = await dbQuery<{
      id: string;
      email: string;
      full_name: string;
      role: string;
      password_hash: string | null;
      is_active: boolean;
    }>(
      `SELECT id, email, full_name, role, password_hash, is_active
       FROM profiles WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [email]
    );

    const profile = rows[0];
    if (!profile || !profile.password_hash) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }
    if (!profile.is_active) {
      return NextResponse.json(
        { error: "Account is deactivated" },
        { status: 403 }
      );
    }

    const valid = await verifyPassword(password, profile.password_hash);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const token = issueJwt({
      id: profile.id,
      email: profile.email,
      passwordHash: profile.password_hash,
      role: profile.role,
    });

    const response = NextResponse.json({
      user: {
        id: profile.id,
        email: profile.email,
        firstName: (profile.full_name || "").split(" ")[0] || profile.email.split("@")[0],
        lastName: (profile.full_name || "").split(" ").slice(1).join(" ") || "",
        role: profile.role,
        createdAt: new Date().toISOString(),
      },
    });

    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 12, // 12h
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json(
      { error: "Login failed" },
      { status: 500 }
    );
  }
}
