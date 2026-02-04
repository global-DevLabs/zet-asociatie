import { NextRequest, NextResponse } from "next/server";
import { getJwtFromRequest } from "@/lib/auth/jwt";
import { dbQuery } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: activityId } = await params;
    const payload = getJwtFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const memberIds = body.memberIds as string[];
    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return NextResponse.json({ error: "memberIds array required" }, { status: 400 });
    }
    for (const memberId of memberIds) {
      await dbQuery(
        "INSERT INTO activity_participants (activity_id, member_id, status) VALUES ($1, $2, 'attended') ON CONFLICT (activity_id, member_id) DO NOTHING",
        [activityId, memberId]
      );
    }
    await dbQuery(
      "UPDATE activities SET participants_count = (SELECT count(*) FROM activity_participants WHERE activity_id = $1), updated_at = now() WHERE id = $1",
      [activityId]
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Add participants error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: activityId } = await params;
    const payload = getJwtFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const { memberId, status, note } = body;
    if (!memberId) {
      return NextResponse.json({ error: "memberId required" }, { status: 400 });
    }
    const updates: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    if (status !== undefined) {
      updates.push(`status = $${i++}`);
      values.push(status);
    }
    if (note !== undefined) {
      updates.push(`note = $${i++}`);
      values.push(note);
    }
    if (updates.length === 0) {
      return NextResponse.json({ success: true });
    }
    values.push(activityId, memberId);
    const { rowCount } = await dbQuery(
      `UPDATE activity_participants SET ${updates.join(", ")} WHERE activity_id = $${i++} AND member_id = $${i}`,
      values
    );
    if ((rowCount ?? 0) === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Update participant error:", err);
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
    const { id: activityId } = await params;
    const payload = getJwtFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const memberId = request.nextUrl.searchParams.get("memberId");
    if (!memberId) {
      return NextResponse.json({ error: "memberId required" }, { status: 400 });
    }
    const { rowCount } = await dbQuery(
      "DELETE FROM activity_participants WHERE activity_id = $1 AND member_id = $2",
      [activityId, memberId]
    );
    if ((rowCount ?? 0) === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await dbQuery(
      "UPDATE activities SET participants_count = (SELECT count(*) FROM activity_participants WHERE activity_id = $1), updated_at = now() WHERE id = $1",
      [activityId]
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Remove participant error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
