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
    if (body.description !== undefined) {
      updates.push(`description = $${i++}`);
      values.push(body.description);
    }
    if (body.status !== undefined) {
      updates.push(`status = $${i++}`);
      values.push(body.status);
    }
    if (updates.length === 0) {
      return NextResponse.json({ error: "Not found or no change" }, { status: 404 });
    }
    updates.push("updated_at = now()");
    values.push(id);
    const { rowCount } = await dbQuery(
      `UPDATE whatsapp_groups SET ${updates.join(", ")} WHERE id = $${i}`,
      values
    );
    if ((rowCount ?? 0) === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const { rows } = await dbQuery("SELECT * FROM whatsapp_groups WHERE id = $1", [id]);
    const r = (rows[0] as Record<string, unknown>) ?? {};
    return NextResponse.json({
      id: r.id,
      name: r.name,
      description: r.description,
      status: r.status,
      created_at: r.created_at,
      updated_at: r.updated_at,
      member_count: r.member_count,
    });
  } catch (err) {
    console.error("Update whatsapp group error:", err);
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
    const { rowCount } = await dbQuery("DELETE FROM whatsapp_groups WHERE id = $1", [id]);
    if ((rowCount ?? 0) === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete whatsapp group error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete" },
      { status: 500 }
    );
  }
}
