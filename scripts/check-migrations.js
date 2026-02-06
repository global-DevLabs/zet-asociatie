#!/usr/bin/env node
/**
 * Verify that expected migration files exist in db/migrations/.
 * Does not connect to the database. Use before packaging or CI.
 */
const fs = require("node:fs");
const path = require("node:path");

const migrationsDir = path.join(process.cwd(), "db", "migrations");
const expected = [
  "0001_initial_schema.sql",
  "0002_seed_counters.sql",
  "0003_profiles_password.sql",
  "0004_counter_functions.sql",
  "0005_updated_at_triggers.sql",
  "0006_schema_improvements.sql",
];

if (!fs.existsSync(migrationsDir)) {
  console.error("Missing db/migrations directory.");
  process.exit(1);
}

const present = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
const missing = expected.filter((f) => !present.includes(f));
const extra = present.filter((f) => !expected.includes(f));

if (missing.length > 0) {
  console.error("Missing migration files:", missing.join(", "));
  process.exit(1);
}

if (extra.length > 0) {
  console.warn("Unexpected migration files (not in expected list):", extra.join(", "));
}

console.log("Migrations OK: " + present.length + " files (0001–0006).");
process.exit(0);
