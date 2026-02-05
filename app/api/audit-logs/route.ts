import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { v4 as uuid } from "uuid";

/**
 * POST /api/audit-logs
 * Create an audit log entry
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      actionType,
      module,
      summary,
      entityType,
      entityId,
      entityCode,
      metadata,
      isError,
      userId,
    } = body;

    const db = getDatabase();

    const auditLog = {
      id: uuid(),
      user_id: userId || null,
      action_type: actionType,
      module: module,
      summary: summary,
      metadata: metadata ? JSON.stringify(metadata) : null,
      is_error: isError ? 1 : 0,
      created_at: new Date().toISOString(),
    };

    const stmt = db.prepare(`
      INSERT INTO audit_logs (id, user_id, action_type, module, summary, metadata, is_error, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      auditLog.id,
      auditLog.user_id,
      auditLog.action_type,
      auditLog.module,
      auditLog.summary,
      auditLog.metadata,
      auditLog.is_error,
      auditLog.created_at
    );

    return NextResponse.json({ success: true, id: auditLog.id });
  } catch (error: any) {
    console.error("Error creating audit log:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create audit log" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/audit-logs
 * Get audit logs (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const limit = Number(request.nextUrl.searchParams.get("limit")) || 100;
    const db = getDatabase();

    const logs = db
      .prepare(
        `
      SELECT * FROM audit_logs
      ORDER BY created_at DESC
      LIMIT ?
    `
      )
      .all(limit) as any[];

    return NextResponse.json({
      logs: logs.map((log) => ({
        ...log,
        metadata: log.metadata ? JSON.parse(log.metadata) : null,
      })),
    });
  } catch (error: any) {
    console.error("Error fetching audit logs:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}
