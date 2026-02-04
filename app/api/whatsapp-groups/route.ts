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
      "SELECT * FROM whatsapp_groups ORDER BY name ASC"
    );
    const groups = (rows as Record<string, unknown>[]).map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      status: r.status || "Active",
      created_at: r.created_at,
      updated_at: r.updated_at,
      member_count: r.member_count ?? 0,
    }));
    const { rows: countRows } = await dbQuery(
      "SELECT group_id, count(*)::int AS c FROM whatsapp_group_members GROUP BY group_id"
    );
    const counts: Record<string, number> = {};
    for (const row of countRows as { group_id: string; c: number }[]) {
      counts[row.group_id] = row.c;
    }
    return NextResponse.json(groups.map((g) => ({ ...g, member_count: counts[g.id as string] ?? 0 })));
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
    const name = (body.name as string)?.trim();
    const description = (body.description as string) || null;
    const status = (body.status as string) || "Active";
    if (!name) {
      return NextResponse.json({ error: "name required" }, { status: 400 });
    }
    const id = `wag-${Date.now()}`;
    await dbQuery(
      "INSERT INTO whatsapp_groups (id, name, description, status, member_count) VALUES ($1, $2, $3, $4, 0)",
      [id, name, description, status]
    );
    const { rows } = await dbQuery("SELECT * FROM whatsapp_groups WHERE id = $1", [id]);
    const r = (rows[0] as Record<string, unknown>) ?? {};
    return NextResponse.json({
      id: r.id,
      name: r.name,
      description: r.description,
      status: r.status,
      created_at: r.created_at,
      updated_at: r.updated_at,
      member_count: 0,
    });
  } catch (err) {
    console.error("Create whatsapp group error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create" },
      { status: 500 }
    );
  }
}
