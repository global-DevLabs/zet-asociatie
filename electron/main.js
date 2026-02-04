const { app, BrowserWindow } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const { spawn } = require("node:child_process");
const { ensurePostgresSetup, getConfigPath, loadExistingConfig } = require("./postgres-setup");

const NEXT_DEV_URL = process.env.NEXT_APP_URL || "http://localhost:3000";
const NEXT_PROD_PORT = process.env.PORT || 3000;
const DEFAULT_PG_PORT = 5432;

let nextServerProcess = null;
let postgresProcess = null;

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

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
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
    },
  });

  const urlToLoad = isDev
    ? NEXT_DEV_URL
    : `http://localhost:${NEXT_PROD_PORT}`;

  win.loadURL(urlToLoad);
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
    console.log("[electron] Postgres exited with code:", code);
  });
}

function stopPostgresIfRunning() {
  if (postgresProcess) {
    postgresProcess.kill();
    postgresProcess = null;
  }
}

function startNextStandaloneServer() {
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
    console.error("[electron] Next server not found:", serverEntry);
    return;
  }

  const config = loadConfig();
  const env = {
    ...process.env,
    PORT: String(NEXT_PROD_PORT),
    USE_LOCAL_DB: "true",
    LOCAL_DB_URL: config?.localDbUrl || process.env.LOCAL_DB_URL,
    JWT_SECRET: config?.jwtSecret || process.env.JWT_SECRET,
    ENCRYPTION_SALT: config?.encryptionSalt || process.env.ENCRYPTION_SALT,
    // Run Electron executable as Node so server.js runs correctly on macOS/Windows.
    ELECTRON_RUN_AS_NODE: "1",
  };

  nextServerProcess = spawn(process.execPath, [serverEntry], {
    cwd: standaloneDir,
    env,
    stdio: "inherit",
  });

  nextServerProcess.on("error", (err) => {
    console.error("[electron] Failed to start Next server:", err);
    nextServerProcess = null;
  });

  nextServerProcess.on("exit", (code) => {
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
  if (!isDev && app.isPackaged) {
    const config = await ensurePostgresSetup(app);
    if (config) {
      process.env.LOCAL_DB_URL = config.localDbUrl;
      process.env.JWT_SECRET = config.jwtSecret;
      process.env.ENCRYPTION_SALT = config.encryptionSalt;
      const pg = getPostgresConfig();
      startPostgresIfConfigured(pg.postgresBin, pg.postgresDataDir, pg.port);
    }
  } else {
    const pg = getPostgresConfig();
    startPostgresIfConfigured(pg.postgresBin, pg.postgresDataDir, pg.port);
  }

  startNextStandaloneServer();
  createMainWindow();

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


