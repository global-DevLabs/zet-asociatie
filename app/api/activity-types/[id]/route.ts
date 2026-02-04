import { NextRequest, NextResponse } from "next/server";
import { getJwtFromRequest } from "@/lib/auth/jwt";
import { dbQuery } from "@/lib/db";

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
    if (body.name !== undefined) {
      updates.push(`name = $${i++}`);
      values.push(body.name);
    }
    if (body.category !== undefined) {
      updates.push(`category = $${i++}`);
      values.push(body.category);
    }
    if (body.is_active !== undefined) {
      updates.push(`is_active = $${i++}`);
      values.push(body.is_active);
    }
    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }
    updates.push("updated_at = now()");
    values.push(id);
    const { rowCount } = await dbQuery(
      `UPDATE activity_types SET ${updates.join(", ")} WHERE id = $${i}`,
      values
    );
    if ((rowCount ?? 0) === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const { rows } = await dbQuery("SELECT * FROM activity_types WHERE id = $1", [id]);
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
    console.error("Update activity type error:", err);
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
    const { rowCount } = await dbQuery("DELETE FROM activity_types WHERE id = $1", [id]);
    if ((rowCount ?? 0) === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete activity type error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
