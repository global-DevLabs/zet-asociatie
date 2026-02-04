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
      "SELECT * FROM activities ORDER BY date_from DESC"
    );
    const activities = (rows as Record<string, unknown>[]).map((r) => ({
      id: r.id,
      type_id: r.type_id,
      title: r.title,
      date_from: r.date_from,
      date_to: r.date_to,
      location: r.location,
      notes: r.notes,
      status: r.status || "active",
      archived_at: r.archived_at,
      archived_by: r.archived_by,
      created_by: r.created_by,
      created_at: r.created_at,
      updated_at: r.updated_at,
      participants_count: r.participants_count,
    }));
    return NextResponse.json(activities);
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
    const { rows: maxRows } = await dbQuery(
      "SELECT id FROM activities ORDER BY id DESC LIMIT 1"
    );
    let maxNum = 0;
    const lastId = (maxRows[0] as Record<string, string>)?.id;
    if (lastId) {
      const m = lastId.match(/^ACT-(\d+)$/);
      if (m) maxNum = parseInt(m[1], 10);
    }
    const activityId = `ACT-${String(maxNum + 1).padStart(4, "0")}`;
    const typeId =
      body.type_id != null && body.type_id !== ""
        ? parseInt(String(body.type_id), 10)
        : null;
    const dateFrom =
      body.date_from != null && body.date_from !== ""
        ? String(body.date_from).slice(0, 10)
        : null;
    const dateTo =
      body.date_to != null && body.date_to !== ""
        ? String(body.date_to).slice(0, 10)
        : null;
    await dbQuery(
      `INSERT INTO activities (id, type_id, title, date_from, date_to, location, notes, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8)`,
      [
        activityId,
        typeId !== null && !Number.isNaN(typeId) ? typeId : null,
        body.title ?? null,
        dateFrom,
        dateTo,
        body.location ?? null,
        body.notes ?? null,
        payload.sub,
      ]
    );
    const { rows } = await dbQuery("SELECT * FROM activities WHERE id = $1", [activityId]);
    const r = (rows[0] as Record<string, unknown>) ?? {};
    return NextResponse.json({
      id: r.id,
      type_id: r.type_id,
      title: r.title,
      date_from: r.date_from,
      date_to: r.date_to,
      location: r.location,
      notes: r.notes,
      status: r.status,
      archived_at: r.archived_at,
      archived_by: r.archived_by,
      created_by: r.created_by,
      created_at: r.created_at,
      updated_at: r.updated_at,
      participants_count: r.participants_count,
    });
  } catch (err) {
    console.error("Create activity error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to create activity";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
