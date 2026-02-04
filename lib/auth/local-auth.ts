import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

/**
 * Local authentication primitives (to replace Supabase Auth in later phases).
 *
 * CURRENT STATUS:
 * - This module is not yet wired into any routes or middleware.
 * - Functions are implemented but should only be used once
 *   the migration flags (USE_LOCAL_DB, JWT_SECRET) are properly configured.
 */

export type LocalUser = {
  id: string;
  email: string;
  passwordHash: string;
  role?: string | null;
};

export type JwtPayload = {
  sub: string;
  email: string;
  role?: string | null;
};

const BCRYPT_ROUNDS = 12;

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "JWT_SECRET is not set. This is required for local JWT-based auth.",
    );
  }
  return secret;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function issueJwt(user: LocalUser): string {
  const payload: JwtPayload = {
    sub: user.id,
    email: user.email,
    role: user.role ?? undefined,
  };

  return jwt.sign(payload, getJwtSecret(), {
    algorithm: "HS256",
    expiresIn: "12h",
  });
}

export function verifyJwtToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret());
    return decoded as JwtPayload;
  } catch {
    return null;
  }
}

