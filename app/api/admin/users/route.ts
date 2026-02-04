import { NextRequest, NextResponse } from "next/server";
import { getJwtFromRequest } from "@/lib/auth/jwt";
import { dbQuery } from "@/lib/db";
import { hashPassword } from "@/lib/auth/local-auth";
import { randomUUID } from "node:crypto";

async function requireAdmin(request: NextRequest) {
  const payload = getJwtFromRequest(request);
  if (!payload) return { error: "Unauthorized", status: 401 as const };
  const { rows } = await dbQuery<{ role: string; is_active: boolean }>(
    "SELECT role, is_active FROM profiles WHERE id = $1",
    [payload.sub]
  );
  const profile = rows[0];
  if (!profile || profile.role !== "admin" || !profile.is_active) {
    return { error: "Forbidden - admin access required", status: 403 as const };
  }
  return { payload };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const { rows } = await dbQuery(
      "SELECT id, email, full_name, role, is_active, created_at FROM profiles ORDER BY created_at DESC"
    );
    const users = (rows as Record<string, unknown>[]).map((r) => ({
      id: r.id,
      email: r.email,
      full_name: r.full_name,
      role: r.role,
      is_active: r.is_active,
      created_at: r.created_at,
    }));
    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error in GET /api/admin/users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { email, password, full_name, role } = body;

    if (!email || !password || !role) {
      return NextResponse.json(
        { error: "Missing required fields: email, password, role" },
        { status: 400 }
      );
    }
    if (!["admin", "editor", "viewer"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be admin, editor, or viewer" },
        { status: 400 }
      );
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const { rows: existing } = await dbQuery(
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
    const fullName = full_name || email.split("@")[0];

    await dbQuery(
      `INSERT INTO profiles (id, email, full_name, role, password_hash, is_active, created_at)
       VALUES ($1, $2, $3, $4, $5, true, now())`,
      [id, email, fullName, role, passwordHash]
    );

    const { rows: newRows } = await dbQuery(
      "SELECT id, email, full_name, role, is_active, created_at FROM profiles WHERE id = $1",
      [id]
    );
    const newProfile = (newRows[0] as Record<string, unknown>) ?? {};

    return NextResponse.json({ user: newProfile }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/admin/users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
