import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * GET /api/admin/users
 * List all users (admin only)
 */
export async function GET(request: NextRequest) {
  try {
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

    // Fetch all profiles (using regular client with RLS - admin can see all)
    const { data: profiles, error: fetchError } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, is_active, created_at")
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error("Error fetching profiles:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch users" },
        { status: 500 }
      );
    }

    return NextResponse.json({ users: profiles });
  } catch (error) {
    console.error("Error in GET /api/admin/users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/users
 * Create a new user (admin only)
 * 
 * Body: { email: string, password: string, full_name?: string, role: 'admin' | 'editor' | 'viewer' }
 */
export async function POST(request: NextRequest) {
  try {
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
    const { email, password, full_name, role } = body;

    // Validate required fields
    if (!email || !password || !role) {
      return NextResponse.json(
        { error: "Missing required fields: email, password, role" },
        { status: 400 }
      );
    }

    // Validate role
    if (!["admin", "editor", "viewer"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be admin, editor, or viewer" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Validate password strength (minimum 6 characters)
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Create user using admin client
    const adminClient = getSupabaseAdmin();
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: full_name || email.split("@")[0],
        role, // This will be used by the trigger to set the profile role
      },
    });

    if (createError) {
      console.error("Error creating user:", createError);
      
      // Check for duplicate email error
      if (createError.message.includes("already") || createError.message.includes("exists")) {
        return NextResponse.json(
          { error: "A user with this email already exists" },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: createError.message || "Failed to create user" },
        { status: 500 }
      );
    }

    if (!newUser.user) {
      return NextResponse.json(
        { error: "User creation failed - no user returned" },
        { status: 500 }
      );
    }

    // Wait a moment for the trigger to create the profile
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Fetch the created profile to return it
    const { data: newProfile, error: profileFetchError } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, is_active, created_at")
      .eq("id", newUser.user.id)
      .single();

    if (profileFetchError) {
      console.warn("Profile created but failed to fetch:", profileFetchError);
      // Return basic user info even if profile fetch fails
      return NextResponse.json({
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
          role,
        },
      }, { status: 201 });
    }

    return NextResponse.json({ user: newProfile }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/admin/users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
