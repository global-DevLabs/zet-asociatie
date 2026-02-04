import { NextRequest, NextResponse } from "next/server";
import { getJwtFromRequest } from "@/lib/auth/jwt";
import { dbQuery } from "@/lib/db";

async function requireAdmin(request: NextRequest) {
  const payload = getJwtFromRequest(request);
  if (!payload) return { error: "Unauthorized", status: 401 as const };
  const { rows } = await dbQuery<{ role: string; is_active: boolean }>(
    "SELECT role, is_active FROM profiles WHERE id = $1",
    [payload.sub]
  );
  const profile = rows[0];
  if (!profile || profile.role !== "admin" || !profile.is_active) {
    return { error: "Forbidden - admin access required", status: 403 as const };
  }
  return { payload };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const { payload } = auth;
    const { id: targetUserId } = await params;

    const body = await request.json();
    const { role, is_active } = body;

    if (role === undefined && is_active === undefined) {
      return NextResponse.json(
        { error: "No fields to update. Provide role or is_active" },
        { status: 400 }
      );
    }
    if (role !== undefined && !["admin", "editor", "viewer"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be admin, editor, or viewer" },
        { status: 400 }
      );
    }
    if (is_active !== undefined && typeof is_active !== "boolean") {
      return NextResponse.json(
        { error: "Invalid is_active. Must be a boolean" },
        { status: 400 }
      );
    }

    if (payload.sub === targetUserId) {
      if (role && role !== "admin") {
        return NextResponse.json(
          { error: "Cannot demote yourself from admin role" },
          { status: 400 }
        );
      }
      if (is_active === false) {
        return NextResponse.json(
          { error: "Cannot deactivate your own account" },
          { status: 400 }
        );
      }
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    if (role !== undefined) {
      updates.push(`role = $${i++}`);
      values.push(role);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${i++}`);
      values.push(is_active);
    }
    values.push(targetUserId);
    const { rowCount } = await dbQuery(
      `UPDATE profiles SET ${updates.join(", ")} WHERE id = $${i}`,
      values
    );
    if ((rowCount ?? 0) === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { rows } = await dbQuery(
      "SELECT id, email, full_name, role, is_active, created_at FROM profiles WHERE id = $1",
      [targetUserId]
    );
    const updated = (rows[0] as Record<string, unknown>) ?? {};
    return NextResponse.json({ user: updated });
  } catch (error) {
    console.error("Error in PATCH /api/admin/users/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const { payload } = auth;
    const { id: targetUserId } = await params;

    if (payload.sub === targetUserId) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    const { rowCount } = await dbQuery(
      "UPDATE profiles SET is_active = false WHERE id = $1",
      [targetUserId]
    );
    if ((rowCount ?? 0) === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/admin/users/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
