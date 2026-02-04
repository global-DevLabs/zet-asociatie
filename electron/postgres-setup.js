/**
 * First-run PostgreSQL setup for the Electron app (Windows offline).
 *
 * - Ensures a data directory and runs initdb if needed.
 * - Creates the app database and sets the postgres user password.
 * - Runs SQL migrations.
 * - Writes config.json (LOCAL_DB_URL, POSTGRES_BIN, POSTGRES_DATA_DIR, secrets).
 *
 * Requires bundled Postgres at resources/postgres-win (see README-electron.md).
 */

const path = require("node:path");
const fs = require("node:fs");
const { spawn, spawnSync } = require("node:child_process");
const debugLog = require("./debug-log");
const DB_NAME = "zet_asociatie";
const PG_PORT = 5432;

function getAppDataDir(app) {
  return app.getPath("userData");
}

function getConfigPath(app) {
  return path.join(getAppDataDir(app), "config.json");
}

function getDataDir(app) {
  return path.join(getAppDataDir(app), "pgdata");
}

/**
 * Resolve path to bundled Postgres (when packaged).
 * Expects: resources/postgres-win/bin/initdb.exe and postgres.exe
 */
function getBundledPostgresBinDir() {
  const resourcesPath = process.resourcesPath;
  if (!resourcesPath) return null;
  const binDir = path.join(resourcesPath, "postgres-win", "bin");
  const initdbPath = path.join(binDir, "initdb.exe");
  if (fs.existsSync(initdbPath)) return binDir;
  return null;
}

/**
 * Wait for Postgres to accept TCP connections and finish "starting up" (no pg dependency in main process).
 * Uses more attempts and longer delay so "database system is starting up" does not run bootstrap too early.
 */
function waitForPostgresTcp(port, maxAttempts = 60) {
  const net = require("node:net");
  return new Promise((resolve) => {
    let attempts = 0;
    function tryConnect() {
      const socket = net.createConnection(port, "127.0.0.1", () => {
        socket.destroy();
        resolve(true);
      });
      socket.on("error", () => {
        attempts++;
        if (attempts >= maxAttempts) resolve(false);
        else setTimeout(tryConnect, 800);
      });
    }
    tryConnect();
  });
}

/**
 * Load existing config if present and data dir is initialized.
 */
function loadExistingConfig(app) {
  const configPath = getConfigPath(app);
  const dataDir = getDataDir(app);
  const pgVersion = path.join(dataDir, "PG_VERSION");
  if (!fs.existsSync(configPath) || !fs.existsSync(pgVersion)) {
    return null;
  }
  try {
    const data = fs.readFileSync(configPath, "utf8");
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/**
 * Ensure Postgres is set up: load config or run first-run setup.
 * Returns config object { localDbUrl, postgresBin, postgresDataDir, port, jwtSecret, encryptionSalt }.
 */
async function ensurePostgresSetup(app) {
  const baseDir = getAppDataDir(app);
  const configPath = getConfigPath(app);
  const dataDir = getDataDir(app);

  const existing = loadExistingConfig(app);
  if (existing) {
    return existing;
  }

  const binDir = getBundledPostgresBinDir();
  if (!binDir) {
    debugLog.log("INFO", "[postgres-setup] Bundled Postgres not found at resources/postgres-win. Set POSTGRES_BIN and POSTGRES_DATA_DIR for manual setup.");
    return null;
  }

  const initdbPath = path.join(binDir, "initdb.exe");
  const postgresPath = path.join(binDir, "postgres.exe");

  if (!fs.existsSync(initdbPath) || !fs.existsSync(postgresPath)) {
    debugLog.error(`[postgres-setup] initdb or postgres not found in ${binDir}`);
    return null;
  }

  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }

  if (!fs.existsSync(dataDir)) {
    debugLog.info("[postgres-setup] Running initdb...");
    const initResult = spawnSync(initdbPath, ["-D", dataDir, "-U", "postgres", "--encoding=UTF8"], {
      stdio: "inherit",
      env: { ...process.env, PGUSER: "postgres" },
    });
    if (initResult.status !== 0) {
      debugLog.error("[postgres-setup] initdb failed");
      return null;
    }
  }

  debugLog.info("[postgres-setup] Starting Postgres for first-run setup...");
  const postgresProcess = spawn(
    postgresPath,
    ["-D", dataDir, "-p", String(PG_PORT), "-h", "127.0.0.1"],
    { stdio: "pipe", env: { ...process.env, PGUSER: "postgres" } }
  );

  const ready = await waitForPostgresTcp(PG_PORT);
  if (!ready) {
    postgresProcess.kill();
    debugLog.error("[postgres-setup] Postgres did not become ready");
    return null;
  }

  // Give Postgres a moment to finish "starting up" before running bootstrap (avoids "database system is starting up")
  await new Promise((r) => setTimeout(r, 3000));

  const appRoot = app.getAppPath ? app.getAppPath() : process.cwd();
  debugLog.info(`[postgres-setup] appRoot=${appRoot} loading bootstrap...`);
  let runBootstrap;
  try {
    runBootstrap = require(path.join(appRoot, "scripts", "electron-db-bootstrap.js")).runBootstrap;
  } catch (err) {
    debugLog.error(`[postgres-setup] Could not load bootstrap: ${err.message}`);
    postgresProcess.kill();
    return null;
  }

  const bootstrapResult = await runBootstrap({
    configPath,
    port: String(PG_PORT),
    dbName: DB_NAME,
    appRoot,
  });

  postgresProcess.kill();

  if (!bootstrapResult) {
    debugLog.error("[postgres-setup] Bootstrap failed");
    return null;
  }

  let config;
  try {
    config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch {
    return null;
  }

  if (!config.postgresBin) {
    config.postgresBin = postgresPath;
    config.postgresDataDir = dataDir;
    config.port = PG_PORT;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
  }

  debugLog.info(`[postgres-setup] First-run setup complete. Config at ${configPath}`);
  return config;
}

module.exports = {
  ensurePostgresSetup,
  getConfigPath,
  getDataDir,
  loadExistingConfig,
  getBundledPostgresBinDir,
};
