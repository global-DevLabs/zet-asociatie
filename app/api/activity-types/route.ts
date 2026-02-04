import { NextRequest, NextResponse } from "next/server";
import { getJwtFromRequest } from "@/lib/auth/jwt";
import { dbQuery } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const payload = getJwtFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { rows } = await dbQuery(
      "SELECT * FROM activity_types ORDER BY name ASC"
    );
    const types = (rows as Record<string, unknown>[]).map((r) => ({
      id: String(r.id),
      name: r.name,
      category: r.category,
      is_active: r.is_active,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
    return NextResponse.json(types);
  } catch (e) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = getJwtFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const { rows } = await dbQuery(
      "INSERT INTO activity_types (name, category, is_active) VALUES ($1, $2, $3) RETURNING *",
      [body.name ?? "", body.category ?? null, body.is_active ?? true]
    );
    const r = (rows[0] as Record<string, unknown>) ?? {};
    return NextResponse.json({
      id: String(r.id),
      name: r.name,
      category: r.category,
      is_active: r.is_active,
      created_at: r.created_at,
      updated_at: r.updated_at,
    });
  } catch (err) {
    console.error("Create activity type error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
