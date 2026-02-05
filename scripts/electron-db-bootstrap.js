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

function noop() {}

/**
 * @param {{ configPath: string, port?: string, dbName?: string, appRoot?: string, log?: (s: string) => void, logVerbose?: (s: string) => void, logError?: (s: string) => void }} options
 * @returns {Promise<{ localDbUrl: string } | null>}
 */
async function runBootstrap(options) {
  const configPath = options.configPath || process.env.ELECTRON_DB_CONFIG_PATH;
  const port = options.port || process.env.ELECTRON_DB_PORT || "5432";
  const dbName = options.dbName || process.env.ELECTRON_DB_NAME || "zet_asociatie";
  const appRoot = options.appRoot || process.cwd();
  const log = options.log || ((s) => console.log(s));
  const logVerbose = options.logVerbose || noop;
  const logError = options.logError || ((s) => console.error(s));

  if (!configPath) {
    logError("configPath or ELECTRON_DB_CONFIG_PATH required");
    return null;
  }

  log("Bootstrap: Connecting to Postgres (no password)...");
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
    logError("Bootstrap: Connect — FAILED: " + (err && err.message));
    return null;
  }
  log("Bootstrap: Connect — success.");

  log("Bootstrap: Creating database " + dbName + "...");
  try {
    await client.query(`CREATE DATABASE ${dbName}`);
    log("Bootstrap: Create database — success.");
  } catch (err) {
    if (err.message && err.message.includes("already exists")) {
      logVerbose("Bootstrap: Database already exists; continuing.");
    } else {
      logError("Bootstrap: Create database — FAILED: " + (err && err.message));
      await client.end();
      return null;
    }
  }

  log("Bootstrap: Setting postgres user password...");
  const passwordEscaped = password.replace(/'/g, "''");
  try {
    await client.query(`ALTER USER postgres WITH PASSWORD '${passwordEscaped}'`);
    log("Bootstrap: Set password — success.");
  } catch (err) {
    logError("Bootstrap: Set password — FAILED: " + (err && err.message));
    await client.end();
    return null;
  }
  await client.end();

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

  log("Bootstrap: Writing config to " + configPath + "...");
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
  log("Bootstrap: Config written — success.");

  const migrateScript = path.join(appRoot, "scripts", "migrate.js");
  if (fs.existsSync(migrateScript)) {
    log("Bootstrap: Running migrations (" + migrateScript + ")...");
    const result = spawnSync(process.execPath, [migrateScript], {
      cwd: appRoot,
      env: {
        ...process.env,
        USE_LOCAL_DB: "true",
        LOCAL_DB_URL: localDbUrl,
      },
      stdio: "inherit",
    });
    if (result.status === 0) {
      log("Bootstrap: Migrations — success.");
    } else {
      log("Bootstrap: Migrations — finished with exit code " + (result.status ?? "?") + " (config was written).");
    }
  } else {
    logVerbose("Bootstrap: No migrate script found; skipping.");
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
