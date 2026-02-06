const { app, BrowserWindow, dialog } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const { spawn, spawnSync } = require("node:child_process");
const debugLog = require("./debug-log");

const DATA_FOLDER_NAME = "Admin Membri";

// Create debug.log as early as possible (before app.whenReady), so crashes are logged.
// Uses %APPDATA%\Admin Membri\ on Windows when app is not yet ready.
debugLog.init(null);

const { ensurePostgresSetup, getConfigPath, loadExistingConfig, getLastSetupFailure, startPostgresViaTaskIfNeeded, killPostgresOnPort } = require("./postgres-setup");

const NEXT_DEV_URL = process.env.NEXT_APP_URL || "http://localhost:3000";
/** Packaged app: set in whenReady after finding a free port to avoid EADDRINUSE. */
let nextProdPort = parseInt(process.env.PORT || "3000", 10);
const DEFAULT_PG_PORT = 5432;

/** Base URL for the app (no trailing slash). Load /login so user sees login/setup first. */
function getAppBaseUrl() {
  return isDev ? NEXT_DEV_URL : `http://127.0.0.1:${nextProdPort}`;
}
const LOGIN_PATH = "/login";

let nextServerProcess = null;
let postgresProcess = null;
let mainWindow = null;
/** When true, Postgres was started via scheduled task (admin account); stop via killPostgresOnPort(port). */
let postgresStartedViaTask = false;
let postgresPort = DEFAULT_PG_PORT;

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

// Global error handlers – log to file so we capture crashes (e.g. on Windows)
process.on("uncaughtException", (err) => {
  try {
    debugLog.error(`uncaughtException: ${err.stack || err.message}`);
  } catch (_) {}
  throw err;
});
process.on("unhandledRejection", (reason, promise) => {
  try {
    debugLog.error(`unhandledRejection: ${reason}`);
  } catch (_) {}
});

/** Load config from app userData (set by first-run setup or manual). */
function loadConfig() {
  const configPath = getConfigPath(app);
  if (!fs.existsSync(configPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch {
    return null;
  }
}

function getPostgresConfig() {
  const config = loadConfig();
  if (config?.postgresBin && config?.postgresDataDir) {
    return {
      postgresBin: config.postgresBin,
      postgresDataDir: config.postgresDataDir,
      port: config.port || DEFAULT_PG_PORT,
      startPostgresViaTask: !!config.startPostgresViaTask,
    };
  }
  return {
    postgresBin: process.env.POSTGRES_BIN,
    postgresDataDir: process.env.POSTGRES_DATA_DIR,
    port: parseInt(process.env.POSTGRES_PORT || String(DEFAULT_PG_PORT), 10),
    startPostgresViaTask: false,
  };
}

const COMMON_PG_SERVICE_NAMES = [
  "postgresql-x64-17",
  "postgresql-x64-16",
  "postgresql-x64-15",
  "PostgreSQL 17",
  "PostgreSQL 16",
  "PostgreSQL 15",
];

/**
 * On Windows, try to start the PostgreSQL service when using external Postgres (LOCAL_DB_URL).
 * Service name from config.postgresServiceName, env POSTGRES_SERVICE_NAME, or try common names.
 * Runs "net start <serviceName>"; if the service is already running, net start returns 0.
 */
function tryStartPostgresServiceWindows(config) {
  if (process.platform !== "win32" || !config?.localDbUrl) return;
  const explicit =
    config.postgresServiceName || process.env.POSTGRES_SERVICE_NAME || "";
  const names = explicit ? [explicit] : COMMON_PG_SERVICE_NAMES;
  for (const name of names) {
    const r = spawnSync("net", ["start", name], {
      stdio: "pipe",
      encoding: "utf8",
      windowsHide: true,
    });
    if (r.status === 0) {
      debugLog.info("[MAIN] PostgreSQL service started or already running: " + name);
      return;
    }
    const err = (r.stderr || r.stdout || "").trim();
    if (err && !/already started|running|no such service|specified service does not exist/i.test(err)) {
      debugLog.verbose("[MAIN] Could not start service '" + name + "': " + err);
    }
  }
}

function createMainWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
    },
  });
  mainWindow = win;
  win.on("closed", () => {
    mainWindow = null;
  });

  const baseUrl = getAppBaseUrl();
  const urlToLoad = `${baseUrl}${LOGIN_PATH}`;
  win.loadURL(urlToLoad);
  win.once("ready-to-show", () => win.show());
}

/** Returns a promise that resolves with a free port on 127.0.0.1 (e.g. 3000, 3001, ...). */
function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on("error", reject);
  });
}

/** Wait for the Next server to respond (packaged app). Returns a promise that resolves when ready or after maxAttempts. */
function waitForServerReady() {
  if (isDev) return Promise.resolve();
  const port = nextProdPort;
  const maxAttempts = 40;
  const intervalMs = 500;
  return new Promise((resolve) => {
    let attempts = 0;
    function tryRequest() {
      attempts++;
      const req = http.get(`http://127.0.0.1:${port}${LOGIN_PATH}`, (res) => {
        res.resume();
        resolve();
      });
      req.on("error", () => {
        if (attempts >= maxAttempts) {
          debugLog.info("Server wait timed out; opening window anyway.");
          resolve();
        } else {
          setTimeout(tryRequest, intervalMs);
        }
      });
      req.setTimeout(2000, () => {
        req.destroy();
        if (attempts >= maxAttempts) resolve();
        else setTimeout(tryRequest, intervalMs);
      });
    }
    setTimeout(tryRequest, 300);
  });
}

async function startPostgresIfConfigured(postgresBin, postgresDataDir, port, startViaTask = false) {
  if (!postgresBin || !postgresDataDir) {
    console.log(
      "[electron] Postgres not configured; skipping startup (first-run setup may run next)."
    );
    return;
  }

  if (postgresProcess || (startViaTask && postgresStartedViaTask)) return;

  if (startViaTask && process.platform === "win32") {
    postgresPort = port;
    const ready = await startPostgresViaTaskIfNeeded(postgresBin, postgresDataDir, port);
    if (ready) {
      postgresStartedViaTask = true;
      debugLog.info("[MAIN] Postgres started via scheduled task (least privileges).");
    } else {
      debugLog.error("[MAIN] Failed to start Postgres via task.");
    }
    return;
  }

  postgresProcess = spawn(
    postgresBin,
    ["-D", postgresDataDir, "-p", String(port), "-h", "127.0.0.1"],
    { stdio: "pipe", env: { ...process.env, PGUSER: "postgres" }, cwd: path.dirname(postgresBin) }
  );

  postgresProcess.on("exit", (code) => {
    postgresProcess = null;
    debugLog.info(`Postgres exited with code: ${code}`);
  });
  postgresProcess.on("error", (err) => {
    debugLog.error(`Postgres spawn error: ${err.message}`);
  });
}

function stopPostgresIfRunning() {
  if (postgresStartedViaTask) {
    killPostgresOnPort(postgresPort);
    postgresStartedViaTask = false;
  }
  if (postgresProcess) {
    postgresProcess.kill();
    postgresProcess = null;
  }
}

/** Ensure userData path uses the app display name (Admin Membri), not package.json "name". */
function ensureUserDataPath() {
  const appData = app.getPath("appData");
  const desired = path.join(appData, DATA_FOLDER_NAME);
  app.setPath("userData", desired);
}

/** Run DB migrations so tables exist. Call when we have config with localDbUrl, before starting Next. */
function runMigrationsSync(config) {
  if (!config?.localDbUrl) return;
  let appRoot = app.isPackaged ? app.getAppPath() : process.cwd();
  if (app.isPackaged && appRoot.includes("app.asar")) {
    appRoot = appRoot.replace("app.asar", "app.asar.unpacked");
  }
  const migrateScript = path.join(appRoot, "scripts", "migrate.js");
  if (!fs.existsSync(migrateScript)) {
    debugLog.verbose("[MAIN] No migrate script at " + migrateScript + "; skipping migrations.");
    return;
  }
  debugLog.info("[MAIN] Running database migrations...");
  // Packaged app: process.execPath is the Electron .exe; must run as Node so the script runs.
  const migrateEnv = {
    ...process.env,
    LOCAL_DB_URL: config.localDbUrl,
    USE_LOCAL_DB: "true",
  };
  if (app.isPackaged) migrateEnv.ELECTRON_RUN_AS_NODE = "1";
  const result = spawnSync(process.execPath, [migrateScript], {
    cwd: appRoot,
    env: migrateEnv,
    encoding: "utf8",
    stdio: "pipe",
  });
  if (result.status === 0) {
    debugLog.info("[MAIN] Migrations completed.");
  } else {
    debugLog.error("[MAIN] Migrations failed (exit " + (result.status ?? "?") + "): " + (result.stderr || result.stdout || "").trim());
  }
}

/**
 * @param {Record<string,string>|null} configOverride - If provided (e.g. from ensurePostgresSetup), use this for env so the Next server always gets DB/JWT config.
 */
function startNextStandaloneServer(configOverride) {
  if (isDev) {
    return;
  }

  if (nextServerProcess) {
    return;
  }

  // Packaged app: use app path (works from Finder/Launchpad). Dev/build: use cwd.
  let appRoot = app.isPackaged ? app.getAppPath() : process.cwd();
  // Standalone is unpacked from asar so it must be read from app.asar.unpacked.
  if (app.isPackaged && appRoot.includes("app.asar")) {
    appRoot = appRoot.replace("app.asar", "app.asar.unpacked");
  }
  const standaloneDir = path.join(appRoot, ".next", "standalone");
  const serverEntry = path.join(standaloneDir, "server.js");

  if (!fs.existsSync(serverEntry)) {
    debugLog.error(`Next server not found: ${serverEntry}`);
    debugLog.info(`appRoot=${appRoot} standaloneDir=${standaloneDir}`);
    return;
  }
  debugLog.info(`Starting Next server: cwd=${standaloneDir} execPath=${process.execPath}`);

  const config = configOverride || loadConfig();
  if (!config?.localDbUrl || !config?.jwtSecret) {
    debugLog.error("Next server started without LOCAL_DB_URL or JWT_SECRET; login/setup will return 503.");
  }
  // Prefer standalone's node_modules (has full Next.js from build); then app root for pg etc.
  const standaloneNodeModules = path.join(standaloneDir, "node_modules");
  const appNodeModules = path.join(appRoot, "node_modules");
  const nodePath = process.env.NODE_PATH
    ? `${standaloneNodeModules}${path.delimiter}${appNodeModules}${path.delimiter}${process.env.NODE_PATH}`
    : `${standaloneNodeModules}${path.delimiter}${appNodeModules}`;
  const env = {
    ...process.env,
    PORT: String(nextProdPort),
    USE_LOCAL_DB: "true",
    LOCAL_DB_URL: config?.localDbUrl || process.env.LOCAL_DB_URL || "",
    JWT_SECRET: config?.jwtSecret || process.env.JWT_SECRET || "",
    ENCRYPTION_SALT: config?.encryptionSalt || process.env.ENCRYPTION_SALT || "",
    ELECTRON_RUN_AS_NODE: "1",
    NODE_PATH: nodePath,
  };

  nextServerProcess = spawn(process.execPath, [serverEntry], {
    cwd: standaloneDir,
    env,
    stdio: "inherit",
  });

  nextServerProcess.on("error", (err) => {
    debugLog.error(`Failed to start Next server: ${err.message} (${err.code || ""})`);
    nextServerProcess = null;
  });

  nextServerProcess.on("exit", (code, signal) => {
    debugLog.info(`Next server exited code=${code} signal=${signal}`);
    nextServerProcess = null;
    if (!isDev && code !== 0 && code !== null) {
      app.quit();
    }
  });
}

function stopNextStandaloneServer() {
  if (nextServerProcess) {
    nextServerProcess.kill();
    nextServerProcess = null;
  }
}

// Single instance: prevent second launch from starting another process; focus existing window instead.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}
app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.whenReady().then(async () => {
  debugLog.init(app);
  ensureUserDataPath();
  debugLog.info(`App ready. isPackaged=${app.isPackaged} isDev=${isDev}`);
  debugLog.info(`Debug log file: ${debugLog.getLogPath()}`);

  let nextConfig = null;
  try {
    if (!isDev && app.isPackaged) {
      debugLog.info("[MAIN] ========== Setup: Starting ==========");
      debugLog.verbose("[MAIN] Step: Running first-run / Postgres setup...");
      const config = await ensurePostgresSetup(app);
      nextConfig = config;
      if (config) {
        debugLog.info("[MAIN] Setup: Postgres setup — success.");
        debugLog.verbose("[MAIN] Step: Applying config to process env.");
        process.env.LOCAL_DB_URL = config.localDbUrl;
        process.env.JWT_SECRET = config.jwtSecret;
        process.env.ENCRYPTION_SALT = config.encryptionSalt;
        const pg = getPostgresConfig();
        debugLog.verbose("[MAIN] Step: Starting Postgres server...");
        await startPostgresIfConfigured(pg.postgresBin, pg.postgresDataDir, pg.port, pg.startPostgresViaTask);
      } else {
        debugLog.info("[MAIN] Setup: Postgres setup — skipped or failed (no config).");
        if (getLastSetupFailure() === "admin_refused") {
          debugLog.info("[MAIN] Showing dialog: PostgreSQL cannot run as Administrator.");
          await dialog.showMessageBox({
            type: "error",
            title: "Database setup failed",
            message: "PostgreSQL cannot run as Administrator",
            detail:
              "The bundled database refuses to run when the app is started with administrative permissions.\n\n" +
              "• Do not right-click the app and choose \"Run as administrator\".\n" +
              "• If you are logged in as the built-in Administrator account, create a standard user account and run Admin Membri from there.\n\n" +
              "Alternative: Install PostgreSQL yourself (e.g. from postgresql.org), then set the environment variable LOCAL_DB_URL before starting the app (e.g. postgres://postgres:YourPassword@127.0.0.1:5432/postgres). The app will then use your PostgreSQL instead of the bundled one.",
          });
        }
      }
      debugLog.info("[MAIN] ========== Setup: Complete ==========");
    } else {
      debugLog.verbose("[MAIN] Setup: Skipped (dev or unpackaged). Using existing config or env.");
      const pg = getPostgresConfig();
      await startPostgresIfConfigured(pg.postgresBin, pg.postgresDataDir, pg.port, pg.startPostgresViaTask);
    }

    const configForNext = nextConfig || loadConfig();
    if (configForNext?.localDbUrl && !isDev) {
      // When using external Postgres on Windows, try to start the PostgreSQL service so the app can connect
      if (process.platform === "win32" && !configForNext.postgresBin) {
        tryStartPostgresServiceWindows(configForNext);
        await new Promise((r) => setTimeout(r, 2000)); // give the service a moment to accept connections
      }
      runMigrationsSync(configForNext);
    }

    if (!isDev) {
      try {
        const port = await findFreePort();
        nextProdPort = port;
        debugLog.verbose("[MAIN] Using port " + nextProdPort + " for Next.js server (avoid EADDRINUSE).");
      } catch (err) {
        debugLog.error("[MAIN] findFreePort failed: " + (err && err.message) + "; using " + nextProdPort);
      }
    }

    debugLog.verbose("[MAIN] Step: Starting Next.js standalone server...");
    startNextStandaloneServer(nextConfig);
    debugLog.info("[MAIN] Waiting for Next server...");
    await waitForServerReady();
    debugLog.verbose("[MAIN] Step: Creating main window...");
    createMainWindow();
    debugLog.info("[MAIN] Main window created.");
  } catch (err) {
    debugLog.error(`Startup error: ${err.stack || err.message}`);
    throw err;
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    stopNextStandaloneServer();
    stopPostgresIfRunning();
    app.quit();
  }
});

app.on("before-quit", () => {
  stopNextStandaloneServer();
  stopPostgresIfRunning();
});


