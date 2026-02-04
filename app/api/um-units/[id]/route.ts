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
    if (body.code !== undefined) {
      updates.push(`code = $${i++}`);
      values.push(body.code);
    }
    if (body.name !== undefined) {
      updates.push(`name = $${i++}`);
      values.push(body.name);
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
      `UPDATE um_units SET ${updates.join(", ")} WHERE id = $${i}`,
      values
    );
    if ((rowCount ?? 0) === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const { rows } = await dbQuery("SELECT * FROM um_units WHERE id = $1", [id]);
    const r = (rows[0] as Record<string, unknown>) ?? {};
    return NextResponse.json({
      id: String(r.id),
      code: r.code,
      name: r.name,
      is_active: r.is_active,
      created_at: r.created_at,
      updated_at: r.updated_at,
    });
  } catch (err) {
    console.error("Update um_unit error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update" },
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
    const { rowCount } = await dbQuery("DELETE FROM um_units WHERE id = $1", [id]);
    if ((rowCount ?? 0) === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete um_unit error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete" },
      { status: 500 }
    );
  }
}
