import { NextRequest, NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";
import { hashPassword, issueJwt } from "@/lib/auth/local-auth";
import { getJwtFromRequest } from "@/lib/auth/jwt";
import { AUTH_COOKIE_NAME } from "@/lib/auth/jwt";
import { randomUUID } from "node:crypto";

/**
 * POST /api/auth/register
 * Body: { email, password, full_name?, role? }
 * - If no users exist: allow first user as admin.
 * - If users exist: require JWT and admin role.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, full_name, role = "viewer" } = body;
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }
    const allowedRoles = ["admin", "editor", "viewer"];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 }
      );
    }

    const { rows: countRows } = await dbQuery<{ n: string }>(
      "SELECT count(*)::text AS n FROM profiles"
    );
    const hasUsers = parseInt(countRows[0]?.n || "0", 10) > 0;

    if (hasUsers) {
      const payload = getJwtFromRequest(request);
      if (!payload) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const { rows: adminRows } = await dbQuery<{ role: string }>(
        "SELECT role FROM profiles WHERE id = $1",
        [payload.sub]
      );
      if (adminRows[0]?.role !== "admin") {
        return NextResponse.json({ error: "Forbidden - admin required" }, { status: 403 });
      }
    }

    const { rows: existing } = await dbQuery<{ id: string }>(
      "SELECT id FROM profiles WHERE LOWER(email) = LOWER($1)",
      [email]
    );
    if (existing.length > 0) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    const id = randomUUID();
    const passwordHash = await hashPassword(password);
    const finalRole = hasUsers ? role : "admin";
    const fullName = full_name || email.split("@")[0];

    await dbQuery(
      `INSERT INTO profiles (id, email, full_name, role, password_hash, is_active, created_at)
       VALUES ($1, $2, $3, $4, $5, true, now())`,
      [id, email, fullName, finalRole, passwordHash]
    );

    const token = issueJwt({
      id,
      email,
      passwordHash,
      role: finalRole,
    });

    const response = NextResponse.json({
      user: {
        id,
        email,
        firstName: fullName.split(" ")[0] || "",
        lastName: fullName.split(" ").slice(1).join(" ") || "",
        role: finalRole,
        createdAt: new Date().toISOString(),
      },
    });

    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 12,
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json(
      { error: "Registration failed" },
      { status: 500 }
    );
  }
}
