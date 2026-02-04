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
      "SELECT * FROM um_units WHERE is_active = true ORDER BY code ASC"
    );
    const units = rows.map((r: Record<string, unknown>) => ({
      id: String(r.id),
      code: r.code,
      name: r.name,
      is_active: r.is_active,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
    return NextResponse.json(units);
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
    const code = (body.code as string)?.trim()?.replace(/^UM\s*/i, "")?.replace(/\s+/g, " ");
    const name = (body.name as string) || null;
    const formattedCode = code ? `UM ${code}` : "";
    const { rows } = await dbQuery(
      "INSERT INTO um_units (code, name, is_active) VALUES ($1, $2, true) RETURNING *",
      [formattedCode, name]
    );
    const r = rows[0] as Record<string, unknown>;
    return NextResponse.json({
      id: String(r.id),
      code: r.code,
      name: r.name,
      is_active: r.is_active,
      created_at: r.created_at,
      updated_at: r.updated_at,
    });
  } catch (err) {
    console.error("Create um_unit error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create" },
      { status: 500 }
    );
  }
}
