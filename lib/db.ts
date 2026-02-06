/**
 * SQLite database client for Tauri desktop app.
 * Use this when running inside Tauri (window.__TAURI__) instead of Supabase.
 *
 * Usage:
 *   const db = await getDb();
 *   if (db) {
 *     const rows = await db.select('SELECT * FROM members');
 *     await db.execute('INSERT INTO members (...) VALUES (?, ?, ...)', [vals]);
 *   }
 */

import type Database from "@tauri-apps/plugin-sql";

const DB_URL = "sqlite:zet_asociatie.db";

let dbInstance: Database | null = null;

/**
 * Check if the app is running inside Tauri.
 */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI__" in window;
}

/**
 * Get the SQLite database instance. Returns null if not in Tauri or if load fails.
 */
export async function getDb(): Promise<Database | null> {
  if (!isTauri()) return null;

  if (dbInstance) return dbInstance;

  try {
    const { default: Database } = await import("@tauri-apps/plugin-sql");
    dbInstance = await Database.load(DB_URL);
    return dbInstance;
  } catch (err) {
    console.error("Failed to load SQLite database:", err);
    return null;
  }
}

/**
 * Close the database connection. Call when app is shutting down.
 */
export async function closeDb(): Promise<void> {
  if (dbInstance) {
    await dbInstance.close();
    dbInstance = null;
  }
}

/**
 * Get next member code (5-digit: 01047).
 * Replaces Supabase RPC get_next_member_code.
 */
export async function getNextMemberCode(): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;

  await db.execute("UPDATE _sequences SET value = value + 1 WHERE name = 'member_code'");
  const result = await db.select<{ value: number }[]>("SELECT value FROM _sequences WHERE name = 'member_code'");
  if (result && result.length > 0) {
    return String(result[0].value).padStart(5, "0");
  }
  return null;
}

/**
 * Get next payment code (P-000001).
 * Replaces Supabase RPC get_next_payment_code.
 */
export async function getNextPaymentCode(): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;

  await db.execute("UPDATE _sequences SET value = value + 1 WHERE name = 'payment_code'");
  const result = await db.select<{ value: number }[]>("SELECT value FROM _sequences WHERE name = 'payment_code'");
  if (result && result.length > 0) {
    return `P-${String(result[0].value).padStart(6, "0")}`;
  }
  return null;
}

/**
 * Search members via FTS5 or LIKE fallback.
 * Replaces Supabase RPC search_members_fulltext.
 */
export async function searchMembers(query: string): Promise<string[]> {
  const db = await getDb();
  if (!db || !query?.trim()) return [];

  const q = query.trim();
  try {
    // FTS5: use * for prefix matching, escape special chars
    const ftsQuery = q.split(/\s+/).map((t) => `${t}*`).join(" ");
    const rows = await db.select<{ id: string }[]>(
      "SELECT m.id FROM members m JOIN members_fts fts ON m.rowid = fts.rowid WHERE members_fts MATCH ?",
      [ftsQuery]
    );
    if (rows && rows.length > 0) {
      return rows.map((r) => r.id);
    }
  } catch {
    // Fallback to LIKE search
    const likeQuery = `%${q}%`;
    const rows = await db.select<{ id: string }[]>(
      `SELECT id FROM members
       WHERE member_code LIKE ? OR first_name LIKE ? OR last_name LIKE ?
          OR (rank IS NOT NULL AND rank LIKE ?) OR (unit IS NOT NULL AND unit LIKE ?)
          OR (email IS NOT NULL AND email LIKE ?) OR (phone IS NOT NULL AND phone LIKE ?)`,
      [likeQuery, likeQuery, likeQuery, likeQuery, likeQuery, likeQuery, likeQuery]
    );
    if (rows && rows.length > 0) {
      return rows.map((r) => r.id);
    }
  }
  return [];
}
