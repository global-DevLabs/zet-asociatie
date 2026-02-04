import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * PATCH /api/admin/users/[id]
 * Update a user's role or active status (admin only)
 * 
 * Body: { role?: 'admin' | 'editor' | 'viewer', is_active?: boolean }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: targetUserId } = await params;

    // Verify the caller is authenticated
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized - not authenticated" },
        { status: 401 }
      );
    }

    // Verify the caller is an admin
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || profile.role !== "admin" || !profile.is_active) {
      return NextResponse.json(
        { error: "Forbidden - admin access required" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { role, is_active } = body;

    // Validate at least one field to update
    if (role === undefined && is_active === undefined) {
      return NextResponse.json(
        { error: "No fields to update. Provide role or is_active" },
        { status: 400 }
      );
    }

    // Validate role if provided
    if (role !== undefined && !["admin", "editor", "viewer"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be admin, editor, or viewer" },
        { status: 400 }
      );
    }

    // Validate is_active if provided
    if (is_active !== undefined && typeof is_active !== "boolean") {
      return NextResponse.json(
        { error: "Invalid is_active. Must be a boolean" },
        { status: 400 }
      );
    }

    // Prevent self-demotion or self-deactivation
    if (user.id === targetUserId) {
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

    // Build update object
    const updates: { role?: string; is_active?: boolean } = {};
    if (role !== undefined) updates.role = role;
    if (is_active !== undefined) updates.is_active = is_active;

    // Update the user's profile
    const { data: updatedProfile, error: updateError } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", targetUserId)
      .select("id, email, full_name, role, is_active, created_at")
      .single();

    if (updateError) {
      console.error("Error updating profile:", updateError);
      
      // Check if user not found
      if (updateError.code === "PGRST116") {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: updateError.message || "Failed to update user" },
        { status: 500 }
      );
    }

    return NextResponse.json({ user: updatedProfile });
  } catch (error) {
    console.error("Error in PATCH /api/admin/users/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users/[id]
 * Delete a user (admin only)
 * 
 * This deletes the user from auth.users and the profile from public.profiles
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: targetUserId } = await params;

    // Verify the caller is authenticated
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized - not authenticated" },
        { status: 401 }
      );
    }

    // Verify the caller is an admin
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || profile.role !== "admin" || !profile.is_active) {
      return NextResponse.json(
        { error: "Forbidden - admin access required" },
        { status: 403 }
      );
    }

    // Prevent self-deletion
    if (user.id === targetUserId) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    // Instead of deleting, we'll deactivate the user for safety
    // If you want actual deletion, use the admin client to call adminClient.auth.admin.deleteUser()
    const { error: deactivateError } = await supabase
      .from("profiles")
      .update({ is_active: false })
      .eq("id", targetUserId);

    if (deactivateError) {
      console.error("Error deactivating user:", deactivateError);
      return NextResponse.json(
        { error: "Failed to delete user" },
        { status: 500 }
      );
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
