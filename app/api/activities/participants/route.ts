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
      "SELECT activity_id, member_id, status, note, created_at FROM activity_participants"
    );
    const list = (rows as Record<string, unknown>[]).map((r) => ({
      activity_id: r.activity_id,
      member_id: r.member_id,
      status: r.status,
      note: r.note,
      created_at: r.created_at,
    }));
    return NextResponse.json(list);
  } catch (e) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
