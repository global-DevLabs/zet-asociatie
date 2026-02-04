import { NextRequest, NextResponse } from "next/server";
import { getJwtFromRequest } from "@/lib/auth/jwt";
import { getNextMemberCodes, createMember, memberToDbRow } from "@/lib/repos/members-repo";

export async function POST(request: NextRequest) {
  try {
    const payload = getJwtFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { members } = body as { members: Partial<Record<string, unknown>>[] };

    if (!members || !Array.isArray(members) || members.length === 0) {
      return NextResponse.json(
        { error: "No members provided" },
        { status: 400 }
      );
    }

    const membersNeedingCodes = members.filter((m: Record<string, unknown>) => !m.memberCode).length;
    let generatedCodes: string[] = [];
    if (membersNeedingCodes > 0) {
      generatedCodes = await getNextMemberCodes(membersNeedingCodes);
    }

    let codeIndex = 0;
    const inserted: { member_code: string }[] = [];

    for (const member of members) {
      const memberCode =
        (member.memberCode as string) || generatedCodes[codeIndex++] || null;
      if (!memberCode) continue;

      const row = memberToDbRow(member);
      await createMember(memberCode, {
        ...row,
        status: (member.status as string) ?? "Activ",
        first_name: (member.firstName as string) ?? "",
        last_name: (member.lastName as string) ?? "",
      });
      inserted.push({ member_code: memberCode });
    }

    return NextResponse.json({
      success: true,
      imported: inserted.length,
    });
  } catch (err) {
    console.error("Import API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
