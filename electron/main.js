const { app, BrowserWindow } = require("electron");
const path = require("node:path");
const { spawn } = require("node:child_process");

/**
 * Minimal Electron main process.
 *
 * CURRENT STATUS:
 * - Opens the existing Next.js app in a desktop window.
 * - In production, starts the Next.js standalone server as a child process.
 * - Does NOT yet start Postgres (that will be added in a later step).
 * - Security-conscious defaults for the renderer are enabled.
 *
 * To use (after installing Electron locally):
 *   npm install --save-dev electron electron-builder
 *   npm run electron:dev
 */

const NEXT_DEV_URL = process.env.NEXT_APP_URL || "http://localhost:3000";
const NEXT_PROD_PORT = process.env.PORT || 3000;

// Optional, configurable Postgres integration.
// These should point to a pre-configured local PostgreSQL installation
// when you are ready to enable embedded DB startup.
const POSTGRES_BIN = process.env.POSTGRES_BIN; // e.g. C:\\path\\to\\postgres.exe
const POSTGRES_DATA_DIR = process.env.POSTGRES_DATA_DIR; // e.g. C:\\path\\to\\data
const POSTGRES_PORT = process.env.POSTGRES_PORT || 5432;

let nextServerProcess = null;
let postgresProcess = null;

const isDev =
  process.env.NODE_ENV === "development" || !app.isPackaged;

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

function startPostgresIfConfigured() {
  // For now, only start Postgres if explicit paths are provided.
  if (!POSTGRES_BIN || !POSTGRES_DATA_DIR) {
    console.log(
      "[electron] POSTGRES_BIN or POSTGRES_DATA_DIR not set; skipping Postgres startup.",
    );
    return;
  }

  if (postgresProcess) {
    return;
  }

  postgresProcess = spawn(
    POSTGRES_BIN,
    [
      "-D",
      POSTGRES_DATA_DIR,
      "-p",
      String(POSTGRES_PORT),
      "-h",
      "127.0.0.1",
    ],
    {
      stdio: "inherit",
    },
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

  const standaloneDir = path.join(process.cwd(), ".next", "standalone");
  const serverEntry = path.join(standaloneDir, "server.js");

  nextServerProcess = spawn(
    process.execPath,
    [serverEntry],
    {
      cwd: standaloneDir,
      env: {
        ...process.env,
        PORT: String(NEXT_PROD_PORT),
      },
      stdio: "inherit",
    },
  );

  nextServerProcess.on("exit", (code) => {
    nextServerProcess = null;
    if (!isDev && code !== 0) {
      // In production, quit the app if the server crashes.
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

app.whenReady().then(() => {
  // In production, this is where we will have the full
  // "start Postgres + API on app launch" chain.
  startPostgresIfConfigured();
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


