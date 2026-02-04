import { Pool, PoolClient, QueryResult } from "pg";

/**
 * Lightweight DB abstraction for the future local PostgreSQL instance.
 *
 * IMPORTANT:
 * - This module is not yet wired into the app runtime.
 * - It is safe to keep it unused until the migration is further along.
 *
 * Env expectations (for later phases):
 * - USE_LOCAL_DB: "true" | "false"
 * - LOCAL_DB_URL: PostgreSQL connection string for the local instance
 */

let pool: Pool | null = null;

export type DbClient = {
  query<T = unknown>(text: string, params?: any[]): Promise<QueryResult<T>>;
  release?: () => void;
};

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.LOCAL_DB_URL;
    if (!connectionString) {
      throw new Error(
        "LOCAL_DB_URL is not set. Set it for local PostgreSQL (e.g. from Electron config).",
      );
    }
    pool = new Pool({ connectionString });
  }
  return pool;
}

/**
 * Acquire a client from the pool. For most simple use cases, prefer `dbQuery`.
 */
export async function getDbClient(): Promise<DbClient> {
  const client: PoolClient = await getPool().connect();

  return {
    query: (text, params) => client.query(text, params),
    release: () => client.release(),
  };
}

/**
 * Convenience helper for simple one-off queries.
 * Uses LOCAL_DB_URL (or USE_LOCAL_DB=true + LOCAL_DB_URL) for the local Postgres instance.
 */
export async function dbQuery<T = unknown>(
  text: string,
  params?: any[],
): Promise<QueryResult<T>> {
  const pool = getPool();
  return pool.query<T>(text, params);
}

