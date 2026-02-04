import { NextRequest, NextResponse } from "next/server";
import { getJwtFromRequest } from "@/lib/auth/jwt";
import {
  listMembers,
  createMember,
  getNextMemberCode,
  memberToDbRow,
} from "@/lib/repos/members-repo";

export async function GET(request: NextRequest) {
  try {
    const payload = getJwtFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const members = await listMembers();
    return NextResponse.json(members);
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
    const row = memberToDbRow(body);
    const memberCode = await getNextMemberCode();
    const member = await createMember(memberCode, row);
    return NextResponse.json(member);
  } catch (err) {
    console.error("Create member error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create member" },
      { status: 500 }
    );
  }
}
