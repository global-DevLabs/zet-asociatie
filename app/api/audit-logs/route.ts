import { NextRequest, NextResponse } from "next/server";
import { getJwtFromRequest } from "@/lib/auth/jwt";
import { dbQuery } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const payload = getJwtFromRequest(request);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get("limit") ?? "100", 10), 10000);
    const { rows } = await dbQuery(
      "SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT $1",
      [limit]
    );
    const list = (rows as Record<string, unknown>[]).map((r) => ({
      id: r.id,
      timestamp: r.timestamp,
      actorUserId: r.actor_user_id,
      actorName: r.actor_name,
      actorRole: r.actor_role,
      actionType: r.action_type,
      module: r.module,
      entityType: r.entity_type,
      entityId: r.entity_id,
      entityCode: r.entity_code,
      summary: r.summary,
      metadata: r.metadata,
      userAgent: r.user_agent,
      requestId: r.request_id,
      isError: r.is_error,
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
    const id = `AUDIT-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    await dbQuery(
      `INSERT INTO audit_logs (id, actor_user_id, actor_name, actor_role, action_type, module, entity_type, entity_id, entity_code, summary, metadata, user_agent, request_id, is_error)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        id,
        body.actor_user_id ?? body.actorUserId ?? "anonymous",
        body.actor_name ?? body.actorName ?? "Anonymous",
        body.actor_role ?? body.actorRole ?? "viewer",
        body.action_type ?? body.actionType,
        body.module,
        body.entity_type ?? body.entityType ?? null,
        body.entity_id ?? body.entityId ?? null,
        body.entity_code ?? body.entityCode ?? null,
        body.summary,
        body.metadata ? JSON.stringify(body.metadata) : null,
        body.user_agent ?? body.userAgent ?? null,
        body.request_id ?? body.requestId ?? null,
        body.is_error ?? body.isError ?? false,
      ]
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Audit log POST error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
