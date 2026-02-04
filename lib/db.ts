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
        "LOCAL_DB_URL is not set. This should only be required when USE_LOCAL_DB=true.",
      );
    }

    pool = new Pool({
      connectionString,
    });
  }

  return pool;
}

/**
 * Acquire a client from the pool. For most simple use cases, prefer `dbQuery`.
 */
export async function getDbClient(): Promise<DbClient> {
  if (process.env.USE_LOCAL_DB !== "true") {
    throw new Error(
      "getDbClient was called while USE_LOCAL_DB is not enabled. This function should only be used for the local DB path.",
    );
  }

  const client: PoolClient = await getPool().connect();

  return {
    query: (text, params) => client.query(text, params),
    release: () => client.release(),
  };
}

/**
 * Convenience helper for simple one-off queries.
 */
export async function dbQuery<T = unknown>(
  text: string,
  params?: any[],
): Promise<QueryResult<T>> {
  if (process.env.USE_LOCAL_DB !== "true") {
    throw new Error(
      "dbQuery was called while USE_LOCAL_DB is not enabled. This helper should only be used for the local DB path.",
    );
  }

  const pool = getPool();
  return pool.query<T>(text, params);
}

