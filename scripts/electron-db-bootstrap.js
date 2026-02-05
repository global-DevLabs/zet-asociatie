/**
 * Electron PostgreSQL bootstrap: create least-privileged app role (zet_app),
 * database, grant minimal privileges, run migrations as zet_app, write config.
 *
 * - Connects as postgres only to: create role zet_app, create DB, grant privileges.
 * - Never changes postgres password.
 * - App runs and migrations use postgres://zet_app:<password>@127.0.0.1:<port>/zet_asociatie.
 *
 * CommonJS, pg client, cross-platform. Idempotent where possible (safe if role/DB exist).
 */

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const crypto = require("node:crypto");

const APP_ROLE = "zet_app";
const DB_NAME = "zet_asociatie";

function generateSecret(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

function noop() {}

function escapeSqlLiteral(str) {
  return str.replace(/'/g, "''");
}

/**
 * Create role zet_app (if not exists), create DB owned by zet_app, grant least privilege.
 * Uses superuser connection (postgres). Never alters postgres password.
 * Returns app connection URL or null.
 *
 * @param {import('pg').Client} client - Connected as postgres (to 'postgres' DB)
 * @param {{ port: string, dbName: string, log: (s: string) => void, logVerbose: (s: string) => void, logError: (s: string) => void }} opts
 * @returns {{ appUrl: string, appPassword: string } | null}
 */
function setupRoleAndDatabase(client, opts) {
  const { port, dbName, log, logVerbose, logError } = opts;
  const appPassword = generateSecret(24);

  // 1) Create role zet_app (idempotent: fail if exists and we can't know password)
  log("Bootstrap: Creating role " + APP_ROLE + " (LOGIN, NOSUPERUSER, NOCREATEDB, NOCREATEROLE)...");
  const passwordEscaped = escapeSqlLiteral(appPassword);
  try {
    client.query(
      `CREATE ROLE ${APP_ROLE} WITH LOGIN PASSWORD '${passwordEscaped}' NOSUPERUSER NOCREATEDB NOCREATEROLE`
    );
    log("Bootstrap: Role " + APP_ROLE + " created.");
  } catch (err) {
    if (err.message && err.code === "42710") {
      logError("Bootstrap: Role " + APP_ROLE + " already exists. Restore config or drop the role to re-bootstrap.");
      return null;
    }
    logError("Bootstrap: Create role — FAILED: " + (err && err.message));
    return null;
  }

  // 2) Create database owned by zet_app
  log("Bootstrap: Creating database " + dbName + " (owner " + APP_ROLE + ")...");
  try {
    client.query(`CREATE DATABASE ${dbName} OWNER ${APP_ROLE}`);
    log("Bootstrap: Database created.");
  } catch (err) {
    if (err.message && err.message.includes("already exists")) {
      logVerbose("Bootstrap: Database already exists; continuing.");
    } else {
      logError("Bootstrap: Create database — FAILED: " + (err && err.message));
      return null;
    }
  }

  return { appPassword, appUrl: `postgres://${APP_ROLE}:${encodeURIComponent(appPassword)}@127.0.0.1:${port}/${dbName}` };
}

/**
 * Grant least privilege on database and schema. Run as postgres connected to app DB.
 *
 * @param {import('pg').Client} client - Connected as postgres to app DB
 * @param {{ dbName: string, log: (s: string) => void, logError: (s: string) => void }} opts
 */
function grantLeastPrivilege(client, opts) {
  const { dbName, log, logError } = opts;
  log("Bootstrap: Granting least privilege to " + APP_ROLE + "...");

  const statements = [
    "GRANT CONNECT ON DATABASE " + dbName + " TO " + APP_ROLE,
    "GRANT USAGE ON SCHEMA public TO " + APP_ROLE,
    "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO " + APP_ROLE,
    "GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO " + APP_ROLE,
    "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO " + APP_ROLE,
    "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO " + APP_ROLE,
    "REVOKE CREATE ON SCHEMA public FROM PUBLIC",
  ];

  for (const sql of statements) {
    try {
      client.query(sql);
    } catch (err) {
      if (err.message && err.message.includes("cannot revoke") && sql.includes("REVOKE CREATE")) {
        // PG 15+ may already have this
        continue;
      }
      logError("Bootstrap: Grant failed — " + (err && err.message) + " [" + sql.slice(0, 50) + "...]");
    }
  }
  log("Bootstrap: Privileges granted.");
}

/**
 * Bundled Postgres path: connect as postgres (no password), create zet_app + DB, grant, run migrations as zet_app.
 *
 * @param {{ configPath: string, port?: string, dbName?: string, appRoot?: string, log?: (s: string) => void, logVerbose?: (s: string) => void, logError?: (s: string) => void }} options
 * @returns {Promise<{ localDbUrl: string } | null>}
 */
async function runBootstrap(options) {
  const configPath = options.configPath || process.env.ELECTRON_DB_CONFIG_PATH;
  const port = options.port || process.env.ELECTRON_DB_PORT || "5432";
  const dbName = options.dbName || process.env.ELECTRON_DB_NAME || DB_NAME;
  const appRoot = options.appRoot || process.cwd();
  const log = options.log || ((s) => console.log(s));
  const logVerbose = options.logVerbose || noop;
  const logError = options.logError || ((s) => console.error(s));

  if (!configPath) {
    logError("configPath or ELECTRON_DB_CONFIG_PATH required");
    return null;
  }

  const jwtSecret = generateSecret();
  const encryptionSalt = generateSecret();
  const noPasswordUrl = `postgres://postgres@127.0.0.1:${port}/postgres`;

  const { Client } = require("pg");
  const client = new Client({ connectionString: noPasswordUrl });
  try {
    await client.connect();
  } catch (err) {
    logError("Bootstrap: Connect as postgres — FAILED: " + (err && err.message));
    return null;
  }
  log("Bootstrap: Connected as postgres (no password).");

  const result = setupRoleAndDatabase(client, { port, dbName, log, logVerbose, logError });
  if (!result) {
    await client.end();
    return null;
  }
  const { appUrl } = result;
  await client.end();

  // Connect to app DB as postgres to grant privileges and create extension
  const adminAppDbUrl = `postgres://postgres@127.0.0.1:${port}/${dbName}`;
  const clientAppDb = new Client({ connectionString: adminAppDbUrl });
  try {
    await clientAppDb.connect();
  } catch (err) {
    logError("Bootstrap: Connect to " + dbName + " as postgres — FAILED: " + (err && err.message));
    return null;
  }

  grantLeastPrivilege(clientAppDb, { dbName, log, logError });

  log("Bootstrap: Creating extension pgcrypto (required by migrations)...");
  try {
    await clientAppDb.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
  } catch (err) {
    logError("Bootstrap: CREATE EXTENSION pgcrypto — FAILED: " + (err && err.message));
    await clientAppDb.end();
    return null;
  }
  await clientAppDb.end();

  const postgresDataDir = process.env.ELECTRON_DB_DATA_DIR || "";
  const postgresBin = process.env.POSTGRES_BIN || "";
  const config = {
    localDbUrl: appUrl,
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
    log("Bootstrap: Running migrations as " + APP_ROLE + "...");
    const resultMigrate = spawnSync(process.execPath, [migrateScript], {
      cwd: appRoot,
      env: {
        ...process.env,
        USE_LOCAL_DB: "true",
        LOCAL_DB_URL: appUrl,
      },
      stdio: "inherit",
    });
    if (resultMigrate.status === 0) {
      log("Bootstrap: Migrations — success.");
    } else {
      log("Bootstrap: Migrations — finished with exit code " + (resultMigrate.status ?? "?") + " (config was written).");
    }
  } else {
    logVerbose("Bootstrap: No migrate script found; skipping.");
  }

  return { localDbUrl: appUrl };
}

/**
 * External Postgres path: connect with provided URL (e.g. postgres:Zet2026),
 * create zet_app + DB, grant, run migrations as zet_app.
 *
 * @param {{ connectionUrl: string, configPath: string, appRoot?: string, dbName?: string, jwtSecret?: string, encryptionSalt?: string, log?: (s: string) => void, logVerbose?: (s: string) => void, logError?: (s: string) => void }} options
 * @returns {Promise<{ localDbUrl: string } | null>}
 */
async function runExternalBootstrap(options) {
  const connectionUrl = options.connectionUrl || process.env.LOCAL_DB_URL;
  const configPath = options.configPath || process.env.ELECTRON_DB_CONFIG_PATH;
  const appRoot = options.appRoot || process.cwd();
  const dbName = options.dbName || process.env.ELECTRON_DB_NAME || DB_NAME;
  const log = options.log || ((s) => console.log(s));
  const logVerbose = options.logVerbose || noop;
  const logError = options.logError || ((s) => console.error(s));

  if (!connectionUrl || !configPath) {
    logError("connectionUrl (or LOCAL_DB_URL) and configPath required for external bootstrap");
    return null;
  }

  const jwtSecret = options.jwtSecret || process.env.JWT_SECRET || generateSecret();
  const encryptionSalt = options.encryptionSalt || process.env.ENCRYPTION_SALT || generateSecret();

  let defaultDbUrl;
  try {
    const u = new URL(connectionUrl);
    u.pathname = "/postgres";
    defaultDbUrl = u.toString();
  } catch {
    defaultDbUrl = connectionUrl.replace(/\/[^/]*$/, "/postgres");
  }

  const port = (() => {
    try {
      const u = new URL(connectionUrl);
      return u.port || "5432";
    } catch {
      return "5432";
    }
  })();

  const { Client } = require("pg");
  const client = new Client({ connectionString: defaultDbUrl });
  try {
    await client.connect();
  } catch (err) {
    logError("Bootstrap (external): Connect — FAILED: " + (err && err.message));
    return null;
  }
  log("Bootstrap (external): Connected as postgres.");

  const result = setupRoleAndDatabase(client, { port, dbName, log, logVerbose, logError });
  if (!result) {
    await client.end();
    return null;
  }
  const { appUrl } = result;
  await client.end();

  const adminAppDbUrl = defaultDbUrl.replace(/\/postgres$/, "/" + dbName);
  const clientAppDb = new Client({ connectionString: adminAppDbUrl });
  try {
    await clientAppDb.connect();
  } catch (err) {
    logError("Bootstrap (external): Connect to " + dbName + " — FAILED: " + (err && err.message));
    return null;
  }

  grantLeastPrivilege(clientAppDb, { dbName, log, logError });

  log("Bootstrap (external): Creating extension pgcrypto...");
  try {
    await clientAppDb.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
  } catch (err) {
    logError("Bootstrap (external): CREATE EXTENSION pgcrypto — FAILED: " + (err && err.message));
    await clientAppDb.end();
    return null;
  }
  await clientAppDb.end();

  const config = {
    localDbUrl: appUrl,
    postgresBin: "",
    postgresDataDir: "",
    port: parseInt(port, 10),
    jwtSecret,
    encryptionSalt,
  };

  log("Bootstrap (external): Writing config to " + configPath + "...");
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
  log("Bootstrap (external): Config written — success.");

  const migrateScript = path.join(appRoot, "scripts", "migrate.js");
  if (fs.existsSync(migrateScript)) {
    log("Bootstrap (external): Running migrations as " + APP_ROLE + "...");
    const resultMigrate = spawnSync(process.execPath, [migrateScript], {
      cwd: appRoot,
      env: {
        ...process.env,
        USE_LOCAL_DB: "true",
        LOCAL_DB_URL: appUrl,
      },
      stdio: "inherit",
    });
    if (resultMigrate.status === 0) {
      log("Bootstrap (external): Migrations — success.");
    } else {
      log("Bootstrap (external): Migrations — finished with exit code " + (resultMigrate.status ?? "?") + " (config was written).");
    }
  } else {
    logVerbose("Bootstrap (external): No migrate script found; skipping.");
  }

  return { localDbUrl: appUrl };
}

if (require.main === module) {
  runBootstrap({})
    .then((out) => process.exit(out ? 0 : 1))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { runBootstrap, runExternalBootstrap };
