const fs = require("node:fs");
const path = require("node:path");
const { dbQuery } = require("../lib/db");

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

async function getAppliedMigrations() {
  await dbQuery(`
    CREATE TABLE IF NOT EXISTS migrations (
      id serial PRIMARY KEY,
      name text NOT NULL UNIQUE,
      applied_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  const result = await dbQuery("SELECT name FROM migrations ORDER BY applied_at ASC");

  return new Set(result.rows.map((row) => row.name));
}

async function applyMigration(fileName, sql) {
  console.log(`Applying migration: ${fileName}`);

  await dbQuery("BEGIN");
  try {
    await dbQuery(sql);
    await dbQuery(
      "INSERT INTO migrations (name, applied_at) VALUES ($1, now())",
      [fileName],
    );
    await dbQuery("COMMIT");
  } catch (err) {
    await dbQuery("ROLLBACK");
    console.error(`Failed to apply migration ${fileName}:`, err);
    throw err;
  }
}

async function runMigrations() {
  if (process.env.USE_LOCAL_DB !== "true") {
    console.error(
      "Refusing to run migrations because USE_LOCAL_DB is not set to 'true'.",
    );
    process.exit(1);
  }

  const applied = await getAppliedMigrations();

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

    await applyMigration(file, sql);
  }

  console.log("Migrations complete.");
}

runMigrations().catch((err) => {
  console.error("Migration run failed:", err);
  process.exit(1);
});

