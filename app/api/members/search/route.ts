import { NextRequest, NextResponse } from "next/server";
import { getJwtFromRequest } from "@/lib/auth/jwt";
import { searchMemberIds } from "@/lib/repos/members-repo";

export async function GET(request: NextRequest) {
  try {
    const payload = getJwtFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const q = request.nextUrl.searchParams.get("q") ?? "";
    const memberIds = await searchMemberIds(q);
    return NextResponse.json({ memberIds, error: null });
  } catch (err) {
    console.error("Search error:", err);
    return NextResponse.json(
      { memberIds: null, error: "Search failed", fallback: true },
      { status: 200 }
    );
  }
}

export async function POST() {
  return NextResponse.json({ success: true });
}
