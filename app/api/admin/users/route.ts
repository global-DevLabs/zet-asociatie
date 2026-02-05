import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { listUsers, createUser, getUserProfile } from "@/lib/auth-utils";
import { v4 as uuid } from "uuid";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "supersecretkey-change-in-production"
);

/**
 * GET /api/admin/users
 * List all users (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify the caller is authenticated and is admin
    const token = request.cookies.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized - not authenticated" },
        { status: 401 }
      );
    }

    let user: any;
    try {
      const verified = await jwtVerify(token, JWT_SECRET);
      user = verified.payload;
    } catch (err) {
      return NextResponse.json(
        { error: "Unauthorized - invalid token" },
        { status: 401 }
      );
    }

    // Verify the caller is an admin
    if (user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden - admin access required" },
        { status: 403 }
      );
    }

    // Fetch all users
    const users = listUsers();

    return NextResponse.json({ users });
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
    // Verify the caller is authenticated and is admin
    const token = request.cookies.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized - not authenticated" },
        { status: 401 }
      );
    }

    let user: any;
    try {
      const verified = await jwtVerify(token, JWT_SECRET);
      user = verified.payload;
    } catch (err) {
      return NextResponse.json(
        { error: "Unauthorized - invalid token" },
        { status: 401 }
      );
    }

    // Verify the caller is an admin
    if (user.role !== "admin") {
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

    // Create user
    const userId = uuid();
    const result = createUser(
      userId,
      email,
      password,
      full_name || email.split("@")[0],
      role as "admin" | "editor" | "viewer"
    );

    if (!result.success) {
      // Check for duplicate email error
      if (result.error?.includes("Email")) {
        return NextResponse.json(
          { error: "A user with this email already exists" },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: result.error || "Failed to create user" },
        { status: 500 }
      );
    }

    // Fetch the created user to return it
    const newProfile = getUserProfile(userId);

    if (!newProfile) {
      return NextResponse.json(
        { error: "User created but profile not found" },
        { status: 500 }
      );
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
