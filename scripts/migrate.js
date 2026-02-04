const fs = require("node:fs");
const path = require("node:path");
const { Pool } = require("pg");

/**
 * Very small SQL migration runner for the local PostgreSQL instance.
 *
 * Usage (when LOCAL_DB_URL and USE_LOCAL_DB are configured):
 *
 *   USE_LOCAL_DB=true LOCAL_DB_URL=... node scripts/migrate.js
 *
 * IMPORTANT:
 * - This script is only intended for the local/offline setup,
 *   not for the existing Supabase database.
 */

const MIGRATIONS_DIR = path.join(process.cwd(), "db", "migrations");

function getPool() {
  const connectionString = process.env.LOCAL_DB_URL;
  if (!connectionString) {
    throw new Error("LOCAL_DB_URL is not set.");
  }
  return new Pool({ connectionString });
}

async function dbQuery(pool, text, params) {
  return pool.query(text, params);
}

async function getAppliedMigrations(pool) {
  await dbQuery(pool, `
    CREATE TABLE IF NOT EXISTS migrations (
      id serial PRIMARY KEY,
      name text NOT NULL UNIQUE,
      applied_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  const result = await dbQuery(pool, "SELECT name FROM migrations ORDER BY applied_at ASC");
  return new Set(result.rows.map((row) => row.name));
}

async function applyMigration(pool, fileName, sql) {
  console.log(`Applying migration: ${fileName}`);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query(
      "INSERT INTO migrations (name, applied_at) VALUES ($1, now())",
      [fileName],
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(`Failed to apply migration ${fileName}:`, err);
    throw err;
  } finally {
    client.release();
  }
}

async function runMigrations() {
  if (process.env.USE_LOCAL_DB !== "true") {
    console.error(
      "Refusing to run migrations because USE_LOCAL_DB is not set to 'true'.",
    );
    process.exit(1);
  }

  const pool = getPool();

  try {
    const applied = await getAppliedMigrations(pool);

    if (!fs.existsSync(MIGRATIONS_DIR)) {
      console.log("No migrations directory found, nothing to do.");
      return;
    }

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      if (applied.has(file)) continue;

      const fullPath = path.join(MIGRATIONS_DIR, file);
      const sql = fs.readFileSync(fullPath, "utf8");

      if (!sql.trim()) {
        console.log(`Skipping empty migration file: ${file}`);
        continue;
      }

      await applyMigration(pool, file, sql);
    }

    console.log("Migrations complete.");
  } finally {
    await pool.end();
  }
}

runMigrations().catch((err) => {
  console.error("Migration run failed:", err);
  process.exit(1);
});
