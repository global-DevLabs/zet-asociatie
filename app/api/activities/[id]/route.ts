import { NextRequest, NextResponse } from "next/server";
import { getJwtFromRequest } from "@/lib/auth/jwt";
import { dbQuery } from "@/lib/db";

async function getActivity(id: string) {
  const { rows } = await dbQuery("SELECT * FROM activities WHERE id = $1", [id]);
  const r = (rows[0] as Record<string, unknown>) ?? null;
  if (!r) return null;
  return {
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
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const payload = getJwtFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const activity = await getActivity(id);
    if (!activity) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(activity);
  } catch (e) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const payload = getJwtFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const updates: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    const keys = ["type_id", "title", "date_from", "date_to", "location", "notes", "status"];
    for (const k of keys) {
      if (body[k] !== undefined) {
        updates.push(`${k} = $${i++}`);
        values.push(body[k]);
      }
    }
    if (updates.length === 0) {
      const activity = await getActivity(id);
      if (!activity) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(activity);
    }
    updates.push("updated_at = now()");
    values.push(id);
    const { rowCount } = await dbQuery(
      `UPDATE activities SET ${updates.join(", ")} WHERE id = $${i}`,
      values
    );
    if ((rowCount ?? 0) === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const activity = await getActivity(id);
    return NextResponse.json(activity);
  } catch (err) {
    console.error("Update activity error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const payload = getJwtFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { rowCount } = await dbQuery("DELETE FROM activities WHERE id = $1", [id]);
    if ((rowCount ?? 0) === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete activity error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
