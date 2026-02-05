const { app, BrowserWindow } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const http = require("node:http");
const { spawn } = require("node:child_process");
const { ensurePostgresSetup, getConfigPath, loadExistingConfig } = require("./postgres-setup");
const debugLog = require("./debug-log");

const NEXT_DEV_URL = process.env.NEXT_APP_URL || "http://localhost:3000";
const NEXT_PROD_PORT = process.env.PORT || 3000;
const DEFAULT_PG_PORT = 5432;

/** Base URL for the app (no trailing slash). Load /login so user sees login/setup first. */
function getAppBaseUrl() {
  return isDev ? NEXT_DEV_URL : `http://127.0.0.1:${NEXT_PROD_PORT}`;
}
const LOGIN_PATH = "/login";

let nextServerProcess = null;
let postgresProcess = null;

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
    };
  }
  return {
    postgresBin: process.env.POSTGRES_BIN,
    postgresDataDir: process.env.POSTGRES_DATA_DIR,
    port: parseInt(process.env.POSTGRES_PORT || String(DEFAULT_PG_PORT), 10),
  };
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

  const baseUrl = getAppBaseUrl();
  const urlToLoad = `${baseUrl}${LOGIN_PATH}`;
  win.loadURL(urlToLoad);
  win.once("ready-to-show", () => win.show());
}

/** Wait for the Next server to respond (packaged app). Returns a promise that resolves when ready or after maxAttempts. */
function waitForServerReady() {
  if (isDev) return Promise.resolve();
  const port = parseInt(NEXT_PROD_PORT, 10);
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

function startPostgresIfConfigured(postgresBin, postgresDataDir, port) {
  if (!postgresBin || !postgresDataDir) {
    console.log(
      "[electron] Postgres not configured; skipping startup (first-run setup may run next)."
    );
    return;
  }

  if (postgresProcess) return;

  postgresProcess = spawn(
    postgresBin,
    ["-D", postgresDataDir, "-p", String(port), "-h", "127.0.0.1"],
    { stdio: "pipe", env: { ...process.env, PGUSER: "postgres" } }
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
  if (postgresProcess) {
    postgresProcess.kill();
    postgresProcess = null;
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
  // NODE_PATH so standalone server.js can resolve 'next' (packaged app may not have .next/standalone/node_modules fully unpacked)
  const nodePath = path.join(appRoot, "node_modules");
  const env = {
    ...process.env,
    PORT: String(NEXT_PROD_PORT),
    USE_LOCAL_DB: "true",
    LOCAL_DB_URL: config?.localDbUrl || process.env.LOCAL_DB_URL || "",
    JWT_SECRET: config?.jwtSecret || process.env.JWT_SECRET || "",
    ENCRYPTION_SALT: config?.encryptionSalt || process.env.ENCRYPTION_SALT || "",
    ELECTRON_RUN_AS_NODE: "1",
    NODE_PATH: process.env.NODE_PATH ? `${nodePath}${path.delimiter}${process.env.NODE_PATH}` : nodePath,
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

app.whenReady().then(async () => {
  debugLog.init(app);
  debugLog.info(`App ready. isPackaged=${app.isPackaged} isDev=${isDev}`);

  let nextConfig = null;
  try {
    if (!isDev && app.isPackaged) {
      debugLog.info("Running first-run / Postgres setup...");
      const config = await ensurePostgresSetup(app);
      nextConfig = config;
      if (config) {
        process.env.LOCAL_DB_URL = config.localDbUrl;
        process.env.JWT_SECRET = config.jwtSecret;
        process.env.ENCRYPTION_SALT = config.encryptionSalt;
        const pg = getPostgresConfig();
        startPostgresIfConfigured(pg.postgresBin, pg.postgresDataDir, pg.port);
      } else {
        debugLog.info("No Postgres config (first-run or skipped).");
      }
    } else {
      const pg = getPostgresConfig();
      startPostgresIfConfigured(pg.postgresBin, pg.postgresDataDir, pg.port);
    }

    startNextStandaloneServer(nextConfig);
    debugLog.info("Waiting for Next server...");
    await waitForServerReady();
    debugLog.info("Creating main window...");
    createMainWindow();
    debugLog.info("Main window created.");
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


