import { NextRequest, NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";
import { hashPassword } from "@/lib/auth/local-auth";
import { randomUUID } from "node:crypto";

const CONFIG_MESSAGE =
  "Application is not configured. Please restart the application. If the problem continues, check the application log.";

function checkConfig() {
  if (!process.env.LOCAL_DB_URL || !process.env.JWT_SECRET) {
    return NextResponse.json(
      { error: CONFIG_MESSAGE, setupRequired: true },
      { status: 503 }
    );
  }
  return null;
}

/** Returns whether first-run setup is still required (no admin with password). */
export async function GET() {
  const configError = checkConfig();
  if (configError) return configError;
  try {
    const { rows } = await dbQuery<{ count: string }>(
      `SELECT COUNT(*) AS count FROM profiles
       WHERE role = 'admin' AND password_hash IS NOT NULL AND is_active = true`
    );
    const count = parseInt(rows[0]?.count ?? "0", 10);
    return NextResponse.json({ setupRequired: count === 0 });
  } catch (err) {
    console.error("Setup status error:", err);
    const message = err instanceof Error ? err.message : "";
    const isConfig = /LOCAL_DB_URL|JWT_SECRET|not set|not configured/i.test(message);
    return NextResponse.json(
      { error: isConfig ? CONFIG_MESSAGE : "Could not check setup status", setupRequired: true },
      { status: isConfig ? 503 : 500 }
    );
  }
}

/** Creates the first admin user. Only allowed when no admin with password exists. */
export async function POST(request: NextRequest) {
  const configError = checkConfig();
  if (configError) return configError;
  try {
    const { rows: adminRows } = await dbQuery<{ count: string }>(
      `SELECT COUNT(*) AS count FROM profiles
       WHERE role = 'admin' AND password_hash IS NOT NULL AND is_active = true`
    );
    const adminCount = parseInt(adminRows[0]?.count ?? "0", 10);
    if (adminCount > 0) {
      return NextResponse.json(
        { error: "Setup already completed. Use the login page." },
        { status: 409 }
      );
    }

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
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
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
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
    const fullName = email.split("@")[0];

    await dbQuery(
      `INSERT INTO profiles (id, email, full_name, role, password_hash, is_active, created_at)
       VALUES ($1, $2, $3, 'admin', $4, true, now())`,
      [id, email, fullName, passwordHash]
    );

    return NextResponse.json(
      { success: true, message: "Admin account created. You can now log in." },
      { status: 201 }
    );
  } catch (err) {
    console.error("Setup POST error:", err);
    const message = err instanceof Error ? err.message : "";
    const isConfig = /LOCAL_DB_URL|JWT_SECRET|not set|not configured/i.test(message);
    return NextResponse.json(
      { error: isConfig ? CONFIG_MESSAGE : "Setup failed" },
      { status: isConfig ? 503 : 500 }
    );
  }
}
