import { NextRequest, NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";
import { verifyPassword, issueJwt } from "@/lib/auth/local-auth";
import { AUTH_COOKIE_NAME } from "@/lib/auth/jwt";

const CONFIG_MESSAGE =
  "Application is not configured. Config is created on first run when PostgreSQL starts successfully. If you see this, first-run setup failed: check debug.log for [SETUP] errors, restart the app as Administrator, or ensure port 5432/5433 is free.";

export async function POST(request: NextRequest) {
  if (!process.env.LOCAL_DB_URL || !process.env.JWT_SECRET) {
    return NextResponse.json(
      { error: CONFIG_MESSAGE },
      { status: 503 }
    );
  }
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
    const message = err instanceof Error ? err.message : "";
    const isConfig = /LOCAL_DB_URL|JWT_SECRET|not set|not configured/i.test(message);
    return NextResponse.json(
      { error: isConfig ? CONFIG_MESSAGE : "Login failed" },
      { status: isConfig ? 503 : 500 }
    );
  }
}
