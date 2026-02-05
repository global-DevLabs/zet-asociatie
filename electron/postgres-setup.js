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
const PG_PORT_DEFAULT = 5432;
const PG_PORT_ALT = 5433; // fallback if 5432 is in use (e.g. system PostgreSQL)

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
 * Load existing config if present.
 * Accepts either: (1) config + bundled pgdata (PG_VERSION), or (2) config only (external Postgres).
 */
function loadExistingConfig(app) {
  const configPath = getConfigPath(app);
  if (!fs.existsSync(configPath)) return null;
  try {
    const data = fs.readFileSync(configPath, "utf8");
    const config = JSON.parse(data);
    if (!config.localDbUrl || !config.jwtSecret) return null;
    return config;
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
    debugLog.info("[SETUP] Existing config found; skipping setup.");
    debugLog.verbose("[SETUP] config.json — present, OK");
    return existing;
  }

  debugLog.info("[SETUP] No existing config; checking for external Postgres or bundled...");

  // External Postgres: user installed Postgres and set LOCAL_DB_URL (e.g. password Zet2026)
  const externalUrl = process.env.LOCAL_DB_URL && process.env.LOCAL_DB_URL.trim();
  if (externalUrl) {
    debugLog.info("[SETUP] LOCAL_DB_URL set — using external Postgres (no bundled).");
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
      debugLog.verbose("[SETUP] Created directory: " + baseDir);
    }
    const appRoot = app.getAppPath ? app.getAppPath() : process.cwd();
    let runExternalBootstrap;
    try {
      runExternalBootstrap = require(path.join(appRoot, "scripts", "electron-db-bootstrap.js")).runExternalBootstrap;
    } catch (err) {
      debugLog.error("[SETUP] Load runExternalBootstrap — FAILED: " + err.message);
      return null;
    }
    const result = await runExternalBootstrap({
      connectionUrl: externalUrl,
      configPath,
      appRoot,
      dbName: DB_NAME,
      jwtSecret: process.env.JWT_SECRET && process.env.JWT_SECRET.trim() || undefined,
      encryptionSalt: process.env.ENCRYPTION_SALT && process.env.ENCRYPTION_SALT.trim() || undefined,
      log: (msg) => debugLog.info("[SETUP] " + msg),
      logVerbose: (msg) => debugLog.verbose("[SETUP] " + msg),
      logError: (msg) => debugLog.error("[SETUP] " + msg),
    });
    if (result) {
      const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
      debugLog.info("[SETUP] ========== External Postgres setup complete ==========");
      return config;
    }
    debugLog.error("[SETUP] External bootstrap failed.");
    return null;
  }

  const binDir = getBundledPostgresBinDir();
  if (!binDir) {
    debugLog.error("[SETUP] Dependency: Bundled PostgreSQL — NOT FOUND (resources/postgres-win/bin).");
    debugLog.info("[SETUP] Install Postgres and set LOCAL_DB_URL (e.g. postgres://postgres:Zet2026@127.0.0.1:5432/postgres), or bundle Postgres in resources/postgres-win.");
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

  // Remove stale lock so a crashed previous run doesn't block startup
  const postmasterPid = path.join(dataDir, "postmaster.pid");
  if (fs.existsSync(postmasterPid)) {
    try {
      fs.unlinkSync(postmasterPid);
      debugLog.info("[SETUP] Removed stale postmaster.pid from previous run.");
    } catch (e) {
      debugLog.error("[SETUP] Could not remove postmaster.pid: " + (e && e.message));
    }
  }

  function spawnPostgres(port) {
    const cwd = path.dirname(postgresPath); // so postgres.exe finds DLLs on Windows
    debugLog.verbose("[SETUP] Spawning: " + postgresPath + " cwd=" + cwd);
    return spawn(
      postgresPath,
      ["-D", dataDir, "-p", String(port), "-h", "127.0.0.1"],
      { stdio: "pipe", env: { ...process.env, PGUSER: "postgres" }, cwd }
    );
  }

  /** After spawning, wait a few seconds; if process already exited, we get stderr and avoid a long timeout. */
  function waitForEarlyExit(proc, stderrRef, port, ms = 3000) {
    return new Promise((resolve) => {
      const t = setTimeout(() => resolve(false), ms);
      proc.once("exit", (code, signal) => {
        clearTimeout(t);
        resolve(true);
      });
    });
  }

  function attachPostgresLogging(proc, port) {
    let stderr = "";
    proc.stderr.on("data", (chunk) => {
      const text = (chunk && chunk.toString()) || "";
      stderr += text;
      debugLog.verbose("[SETUP] Postgres(p:" + port + ") stderr: " + text.trim());
    });
    proc.stdout.on("data", (chunk) => {
      debugLog.verbose("[SETUP] Postgres(p:" + port + ") stdout: " + (chunk && chunk.toString()).trim());
    });
    proc.on("exit", (code, signal) => {
      if (code != null && code !== 0) {
        debugLog.error("[SETUP] Postgres process exited code=" + code + " signal=" + signal);
        if (stderr) debugLog.error("[SETUP] Postgres stderr (last): " + stderr.slice(-2000));
      }
    });
    return { getStderr: () => stderr };
  }

  let postgresProcess = null;
  let pgPort = PG_PORT_DEFAULT;
  let stderrRef = { getStderr: () => "" };

  for (const tryPort of [PG_PORT_DEFAULT, PG_PORT_ALT]) {
    if (postgresProcess) {
      postgresProcess.kill();
      postgresProcess = null;
      if (fs.existsSync(postmasterPid)) {
        try { fs.unlinkSync(postmasterPid); } catch (_) {}
      }
      await new Promise((r) => setTimeout(r, 1500)); // allow port to be released
    }

    debugLog.info("[SETUP] Step: Starting PostgreSQL server (temporary, port " + tryPort + ")...");
    postgresProcess = spawnPostgres(tryPort);
    stderrRef = attachPostgresLogging(postgresProcess, tryPort);

    const exitedEarly = await waitForEarlyExit(postgresProcess, stderrRef, tryPort);
    if (exitedEarly) {
      const errText = stderrRef.getStderr();
      debugLog.error("[SETUP] Postgres exited within a few seconds (port " + tryPort + "). Check: missing DLLs in resources/postgres-win/bin, run as Administrator, or antivirus.");
      if (errText) debugLog.error("[SETUP] Postgres stderr: " + errText.slice(-3000));
      postgresProcess = null;
      if (fs.existsSync(postmasterPid)) {
        try { fs.unlinkSync(postmasterPid); debugLog.verbose("[SETUP] Removed postmaster.pid after early exit."); } catch (_) {}
      }
      if (tryPort === PG_PORT_DEFAULT) {
        debugLog.info("[SETUP] Retrying on port " + PG_PORT_ALT + "...");
      }
      continue;
    }

    const ready = await waitForPostgresTcp(tryPort);
    if (ready) {
      pgPort = tryPort;
      if (tryPort !== PG_PORT_DEFAULT) {
        debugLog.info("[SETUP] Using port " + tryPort + " (5432 was not available).");
      }
      break;
    }
    debugLog.error("[SETUP] PostgreSQL did not become ready on port " + tryPort + " (timeout).");
    const errText = stderrRef.getStderr();
    if (errText) {
      debugLog.error("[SETUP] Postgres stderr: " + errText.slice(-3000));
    } else {
      debugLog.info("[SETUP] No Postgres stderr captured — process may have exited early (missing DLLs, try running as Administrator, or check antivirus).");
    }
    if (tryPort === PG_PORT_DEFAULT) {
      debugLog.info("[SETUP] Retrying on port " + PG_PORT_ALT + "...");
    }
  }

  if (!postgresProcess || !(await waitForPostgresTcp(pgPort))) {
    if (postgresProcess) postgresProcess.kill();
    debugLog.error("[SETUP] Step: PostgreSQL server — did not become ready on 5432 or 5433. See stderr above or run app as Administrator.");
    return null;
  }

  debugLog.info("[SETUP] Step: PostgreSQL server — ready on port " + pgPort + ".");

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
    port: String(pgPort),
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
    config.port = pgPort;
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
