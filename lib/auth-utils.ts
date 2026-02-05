import { getDatabase } from "./db";
import crypto from "crypto";

/**
 * Hash a password using PBKDF2
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, 1000, 64, "sha256")
    .toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Verify a password against a hash
 */
export function verifyPassword(password: string, hash: string): boolean {
  const [salt, storedHash] = hash.split(":");
  const passwordHash = crypto
    .pbkdf2Sync(password, salt, 1000, 64, "sha256")
    .toString("hex");
  return passwordHash === storedHash;
}

/**
 * Create a new user in the local database
 */
export function createUser(
  id: string,
  email: string,
  password: string,
  fullName: string,
  role: "admin" | "editor" | "viewer" = "viewer"
): {
  success: boolean;
  error?: string;
} {
  const db = getDatabase();

  try {
    const passwordHash = hashPassword(password);

    const stmt = db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role, is_active)
      VALUES (?, ?, ?, ?, ?, 1)
    `);

    stmt.run(id, email, passwordHash, fullName, role);

    // Also create a profile entry
    const profileStmt = db.prepare(`
      INSERT INTO profiles (id, email, full_name, role, is_active)
      VALUES (?, ?, ?, ?, 1)
    `);

    profileStmt.run(id, email, fullName, role);

    return { success: true };
  } catch (error: any) {
    if (error.message.includes("UNIQUE constraint failed")) {
      return { success: false, error: "Email already exists" };
    }
    return { success: false, error: error.message };
  }
}

/**
 * Authenticate a user
 */
export function authenticateUser(
  email: string,
  password: string
): {
  success: boolean;
  user?: {
    id: string;
    email: string;
    fullName: string;
    role: string;
  };
  error?: string;
} {
  const db = getDatabase();

  try {
    const user = db
      .prepare(
        `
      SELECT id, email, password_hash, full_name, role, is_active
      FROM users
      WHERE email = ?
    `
      )
      .get(email) as any;

    if (!user) {
      return { success: false, error: "Invalid credentials" };
    }

    if (!user.is_active) {
      return { success: false, error: "User is inactive" };
    }

    if (!verifyPassword(password, user.password_hash)) {
      return { success: false, error: "Invalid credentials" };
    }

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name || "",
        role: user.role,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get a user by ID
 */
export function getUserById(id: string): {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
} | null {
  const db = getDatabase();

  try {
    const user = db
      .prepare(
        `
      SELECT id, email, full_name, role, is_active
      FROM users
      WHERE id = ?
    `
      )
      .get(id) as any;

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.full_name || "",
      role: user.role,
      isActive: user.is_active === 1,
    };
  } catch (error) {
    console.error("Error getting user:", error);
    return null;
  }
}

/**
 * Get a user profile (for display)
 */
export function getUserProfile(
  id: string
): {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
} | null {
  const db = getDatabase();

  try {
    const profile = db
      .prepare(
        `
      SELECT id, email, full_name, role, is_active, created_at
      FROM profiles
      WHERE id = ?
    `
      )
      .get(id) as any;

    if (!profile) {
      return null;
    }

    return {
      id: profile.id,
      email: profile.email,
      fullName: profile.full_name || "",
      role: profile.role,
      isActive: profile.is_active === 1,
      createdAt: profile.created_at,
    };
  } catch (error) {
    console.error("Error getting profile:", error);
    return null;
  }
}

/**
 * Update user role
 */
export function updateUserRole(
  id: string,
  role: "admin" | "editor" | "viewer"
): { success: boolean; error?: string } {
  const db = getDatabase();

  try {
    db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, id);
    db.prepare("UPDATE profiles SET role = ? WHERE id = ?").run(role, id);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Deactivate a user
 */
export function deactivateUser(id: string): {
  success: boolean;
  error?: string;
} {
  const db = getDatabase();

  try {
    db.prepare("UPDATE users SET is_active = 0 WHERE id = ?").run(id);
    db.prepare("UPDATE profiles SET is_active = 0 WHERE id = ?").run(id);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * List all users (for admin)
 */
export function listUsers(): Array<{
  id: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}> {
  const db = getDatabase();

  try {
    const users = db
      .prepare(
        `
      SELECT id, email, full_name, role, is_active, created_at
      FROM profiles
      ORDER BY created_at DESC
    `
      )
      .all() as any[];

    return users.map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.full_name || "",
      role: u.role,
      isActive: u.is_active === 1,
      createdAt: u.created_at,
    }));
  } catch (error) {
    console.error("Error listing users:", error);
    return [];
  }
}
