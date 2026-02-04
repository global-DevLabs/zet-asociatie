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
      "SELECT member_id, group_id, joined_at, added_by, notes FROM whatsapp_group_members"
    );
    const list = (rows as Record<string, unknown>[]).map((r) => ({
      member_id: r.member_id,
      group_id: r.group_id,
      joined_at: r.joined_at,
      added_by: r.added_by,
      notes: r.notes,
    }));
    return NextResponse.json(list);
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
    const { memberId, groupId, notes, memberIds, groupIds, bulkGroupId, bulkMemberIds, mode } = body;

    if (memberId && groupId) {
      await dbQuery(
        "INSERT INTO whatsapp_group_members (member_id, group_id, added_by, notes) VALUES ($1, $2, $3, $4) ON CONFLICT (member_id, group_id) DO NOTHING",
        [memberId, groupId, payload.sub, notes ?? null]
      );
      await dbQuery(
        "UPDATE whatsapp_groups SET member_count = (SELECT count(*) FROM whatsapp_group_members WHERE group_id = $1), updated_at = now() WHERE id = $1",
        [groupId]
      );
      return NextResponse.json({ success: true });
    }

    if (memberIds && Array.isArray(memberIds) && bulkGroupId) {
      const replace = mode === "replace";
      if (replace) {
        await dbQuery("DELETE FROM whatsapp_group_members WHERE group_id = $1", [bulkGroupId]);
      }
      for (const mid of memberIds as string[]) {
        await dbQuery(
          "INSERT INTO whatsapp_group_members (member_id, group_id, added_by) VALUES ($1, $2, $3) ON CONFLICT (member_id, group_id) DO NOTHING",
          [mid, bulkGroupId, payload.sub]
        );
      }
      await dbQuery(
        "UPDATE whatsapp_groups SET member_count = (SELECT count(*) FROM whatsapp_group_members WHERE group_id = $1), updated_at = now() WHERE id = $1",
        [bulkGroupId]
      );
      return NextResponse.json({ success: true });
    }

    if (groupIds && Array.isArray(groupIds) && memberId) {
      for (const gid of groupIds as string[]) {
        await dbQuery(
          "INSERT INTO whatsapp_group_members (member_id, group_id, added_by) VALUES ($1, $2, $3) ON CONFLICT (member_id, group_id) DO NOTHING",
          [memberId, gid, payload.sub]
        );
        await dbQuery(
          "UPDATE whatsapp_groups SET member_count = (SELECT count(*) FROM whatsapp_group_members WHERE group_id = $1), updated_at = now() WHERE id = $1",
          [gid]
        );
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  } catch (err) {
    console.error("Member groups POST error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const payload = getJwtFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const memberId = request.nextUrl.searchParams.get("memberId");
    const groupId = request.nextUrl.searchParams.get("groupId");
    const bulkGroupId = request.nextUrl.searchParams.get("bulkGroupId");
    const bulkMemberIds = request.nextUrl.searchParams.get("bulkMemberIds");

    if (memberId && groupId) {
      await dbQuery(
        "DELETE FROM whatsapp_group_members WHERE member_id = $1 AND group_id = $2",
        [memberId, groupId]
      );
      await dbQuery(
        "UPDATE whatsapp_groups SET member_count = (SELECT count(*) FROM whatsapp_group_members WHERE group_id = $1), updated_at = now() WHERE id = $1",
        [groupId]
      );
      return NextResponse.json({ success: true });
    }

    if (bulkGroupId && bulkMemberIds) {
      const ids = JSON.parse(bulkMemberIds as string) as string[];
      for (const mid of ids) {
        await dbQuery(
          "DELETE FROM whatsapp_group_members WHERE member_id = $1 AND group_id = $2",
          [mid, bulkGroupId]
        );
      }
      await dbQuery(
        "UPDATE whatsapp_groups SET member_count = (SELECT count(*) FROM whatsapp_group_members WHERE group_id = $1), updated_at = now() WHERE id = $1",
        [bulkGroupId]
      );
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  } catch (err) {
    console.error("Member groups DELETE error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
