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
 * On Windows / existing data dir, startup can be slower — use more attempts.
 */
function waitForPostgresTcp(port, maxAttempts = 120) {
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
        else setTimeout(tryConnect, 1000);
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

  debugLog.info("[SETUP] ========== Starting first-run setup ==========");
  debugLog.verbose(`[SETUP] baseDir=${baseDir} configPath=${configPath} dataDir=${dataDir}`);

  const existing = loadExistingConfig(app);
  if (existing) {
    debugLog.info("[SETUP] Existing config and data dir found; skipping setup.");
    debugLog.verbose("[SETUP] Dependency: config.json — present, OK");
    return existing;
  }

  debugLog.info("[SETUP] No existing config; checking dependencies...");

  const binDir = getBundledPostgresBinDir();
  if (!binDir) {
    debugLog.error("[SETUP] Dependency: Bundled PostgreSQL — NOT FOUND (resources/postgres-win/bin).");
    debugLog.info("[SETUP] Set POSTGRES_BIN and POSTGRES_DATA_DIR for manual setup, or bundle Postgres in resources/postgres-win.");
    return null;
  }
  debugLog.info(`[SETUP] Dependency: Bundled PostgreSQL — found at ${binDir}`);

  const initdbPath = path.join(binDir, "initdb.exe");
  const postgresPath = path.join(binDir, "postgres.exe");

  if (!fs.existsSync(initdbPath) || !fs.existsSync(postgresPath)) {
    debugLog.error(`[SETUP] Dependency: initdb.exe / postgres.exe — NOT FOUND in ${binDir}`);
    return null;
  }
  debugLog.info("[SETUP] Dependency: initdb.exe, postgres.exe — present, OK");

  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
    debugLog.verbose(`[SETUP] Created directory: ${baseDir}`);
  }

  if (!fs.existsSync(dataDir)) {
    debugLog.info("[SETUP] Step: Running initdb (initializing database cluster)...");
    const initResult = spawnSync(initdbPath, ["-D", dataDir, "-U", "postgres", "--encoding=UTF8"], {
      stdio: "inherit",
      env: { ...process.env, PGUSER: "postgres" },
    });
    if (initResult.status !== 0) {
      debugLog.error("[SETUP] Step: initdb — FAILED (exit " + (initResult.status ?? "?") + ")");
      return null;
    }
    debugLog.info("[SETUP] Step: initdb — success.");
  } else {
    debugLog.verbose("[SETUP] Data dir already exists; skipping initdb.");
  }

  debugLog.info("[SETUP] Step: Starting PostgreSQL server (temporary, for bootstrap)...");
  const postgresProcess = spawn(
    postgresPath,
    ["-D", dataDir, "-p", String(PG_PORT), "-h", "127.0.0.1"],
    { stdio: "pipe", env: { ...process.env, PGUSER: "postgres" } }
  );

  let postgresStderr = "";
  postgresProcess.stderr.on("data", (chunk) => {
    const text = (chunk && chunk.toString()) || "";
    postgresStderr += text;
    debugLog.verbose("[SETUP] Postgres stderr: " + text.trim());
  });
  postgresProcess.stdout.on("data", (chunk) => {
    debugLog.verbose("[SETUP] Postgres stdout: " + (chunk && chunk.toString()).trim());
  });
  postgresProcess.on("exit", (code, signal) => {
    if (code != null && code !== 0) {
      debugLog.error("[SETUP] Postgres process exited code=" + code + " signal=" + signal);
      if (postgresStderr) debugLog.error("[SETUP] Postgres stderr (last): " + postgresStderr.slice(-2000));
    }
  });

  const ready = await waitForPostgresTcp(PG_PORT);
  if (!ready) {
    postgresProcess.kill();
    debugLog.error("[SETUP] Step: PostgreSQL server — did not become ready (timeout ~120s).");
    if (postgresStderr) debugLog.error("[SETUP] Postgres stderr: " + postgresStderr.slice(-3000));
    return null;
  }
  debugLog.info("[SETUP] Step: PostgreSQL server — ready.");

  debugLog.verbose("[SETUP] Waiting 3s for Postgres to finish startup...");
  await new Promise((r) => setTimeout(r, 3000));

  const appRoot = app.getAppPath ? app.getAppPath() : process.cwd();
  debugLog.info("[SETUP] Step: Loading bootstrap script...");
  let runBootstrap;
  try {
    runBootstrap = require(path.join(appRoot, "scripts", "electron-db-bootstrap.js")).runBootstrap;
  } catch (err) {
    debugLog.error("[SETUP] Step: Load bootstrap — FAILED: " + err.message);
    postgresProcess.kill();
    return null;
  }
  debugLog.verbose(`[SETUP] Bootstrap script path: ${path.join(appRoot, "scripts", "electron-db-bootstrap.js")}`);

  const bootstrapResult = await runBootstrap({
    configPath,
    port: String(PG_PORT),
    dbName: DB_NAME,
    appRoot,
    log: (msg) => debugLog.info("[SETUP] " + msg),
    logVerbose: (msg) => debugLog.verbose("[SETUP] " + msg),
    logError: (msg) => debugLog.error("[SETUP] " + msg),
  });

  postgresProcess.kill();
  debugLog.verbose("[SETUP] Stopped temporary Postgres process.");

  if (!bootstrapResult) {
    debugLog.error("[SETUP] Step: Bootstrap — FAILED.");
    return null;
  }
  debugLog.info("[SETUP] Step: Bootstrap — success.");

  let config;
  try {
    config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch (err) {
    debugLog.error("[SETUP] Reading config after bootstrap: " + (err && err.message));
    return null;
  }

  if (!config.postgresBin) {
    config.postgresBin = postgresPath;
    config.postgresDataDir = dataDir;
    config.port = PG_PORT;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
    debugLog.verbose("[SETUP] Wrote postgresBin/postgresDataDir to config.");
  }

  debugLog.info("[SETUP] ========== First-run setup complete ==========");
  debugLog.info(`[SETUP] Config written to: ${configPath}`);
  return config;
}

module.exports = {
  ensurePostgresSetup,
  getConfigPath,
  getDataDir,
  loadExistingConfig,
  getBundledPostgresBinDir,
};
