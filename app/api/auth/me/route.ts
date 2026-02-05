import { NextRequest, NextResponse } from "next/server";
import { getJwtFromRequest } from "@/lib/auth/jwt";
import { dbQuery } from "@/lib/db";

export async function GET(request: NextRequest) {
  if (!process.env.LOCAL_DB_URL || !process.env.JWT_SECRET) {
    return NextResponse.json({ user: null }, { status: 200 });
  }
  try {
    const payload = getJwtFromRequest(request);
    if (!payload) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const { rows } = await dbQuery<{
      id: string;
      email: string;
      full_name: string;
      role: string;
      is_active: boolean;
      created_at: string;
    }>(
      `SELECT id, email, full_name, role, is_active, created_at
       FROM profiles WHERE id = $1 LIMIT 1`,
      [payload.sub]
    );

    const profile = rows[0];
    if (!profile || !profile.is_active) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const nameParts = (profile.full_name || profile.email.split("@")[0]).split(" ");
    return NextResponse.json({
      user: {
        id: profile.id,
        email: profile.email,
        firstName: nameParts[0] || "",
        lastName: nameParts.slice(1).join(" ") || "",
        role: profile.role,
        createdAt: profile.created_at,
      },
    });
  } catch (err) {
    console.error("Auth me error:", err);
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
