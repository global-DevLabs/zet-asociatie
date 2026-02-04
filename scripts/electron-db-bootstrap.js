/**
 * Run by Electron main on first install: create DB, set postgres password,
 * write config.json, run migrations. Uses app node_modules (pg).
 *
 * Can be required from main process: runBootstrap({ configPath, port, dbName }).
 */

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const crypto = require("node:crypto");

function generateSecret(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

/**
 * @param {{ configPath: string, port?: string, dbName?: string, appRoot?: string }} options
 * @returns {Promise<{ localDbUrl: string } | null>}
 */
async function runBootstrap(options) {
  const configPath = options.configPath || process.env.ELECTRON_DB_CONFIG_PATH;
  const port = options.port || process.env.ELECTRON_DB_PORT || "5432";
  const dbName = options.dbName || process.env.ELECTRON_DB_NAME || "zet_asociatie";
  const appRoot = options.appRoot || process.cwd();

  if (!configPath) {
    console.error("configPath or ELECTRON_DB_CONFIG_PATH required");
    return null;
  }

  const password = generateSecret(16);
  const jwtSecret = generateSecret();
  const encryptionSalt = generateSecret();

  const noPasswordUrl = `postgres://postgres@127.0.0.1:${port}/postgres`;
  const localDbUrl = `postgres://postgres:${encodeURIComponent(password)}@127.0.0.1:${port}/${dbName}`;

  const { Client } = require("pg");
  const client = new Client({ connectionString: noPasswordUrl });
  try {
    await client.connect();
  } catch (err) {
    console.error("Could not connect to Postgres:", err.message);
    return null;
  }

  try {
    await client.query(`CREATE DATABASE ${dbName}`);
  } catch (err) {
    if (!err.message || !err.message.includes("already exists")) {
      console.error("Create database failed:", err.message);
      await client.end();
      return null;
    }
    // Database already exists (e.g. from a previous run); continue to set password and config
  }

  // Use literal in SQL (escape single quotes) so older Postgres builds accept it; $1 can cause "syntax error at or near $1"
  const passwordEscaped = password.replace(/'/g, "''");
  try {
    await client.query(`ALTER USER postgres WITH PASSWORD '${passwordEscaped}'`);
  } catch (err) {
    console.error("ALTER USER postgres failed:", err.message);
    await client.end();
    return null;
  } finally {
    await client.end();
  }

  const postgresDataDir = process.env.ELECTRON_DB_DATA_DIR || "";
  const postgresBin = process.env.POSTGRES_BIN || "";

  const config = {
    localDbUrl,
    postgresBin,
    postgresDataDir,
    port: parseInt(port, 10),
    jwtSecret,
    encryptionSalt,
  };

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");

  const migrateScript = path.join(appRoot, "scripts", "migrate.js");
  if (fs.existsSync(migrateScript)) {
    const result = spawnSync(process.execPath, [migrateScript], {
      cwd: appRoot,
      env: {
        ...process.env,
        USE_LOCAL_DB: "true",
        LOCAL_DB_URL: localDbUrl,
      },
      stdio: "inherit",
    });
    if (result.status !== 0) {
      console.warn("Migrations reported non-zero exit; config was written.");
    }
  }

  return { localDbUrl };
}

if (require.main === module) {
  runBootstrap({})
    .then((out) => process.exit(out ? 0 : 1))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { runBootstrap };
