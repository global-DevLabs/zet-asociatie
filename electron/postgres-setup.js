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

/** Set when setup fails due to PostgreSQL refusing to run as Administrator (for in-app dialog). */
let lastSetupFailure = null;

function getLastSetupFailure() {
  return lastSetupFailure;
}

/** On Windows, returns true if the current process has administrative privileges. */
function isWindowsAdmin() {
  if (process.platform !== "win32") return false;
  try {
    const r = spawnSync("net", ["session"], { stdio: "pipe", windowsHide: true });
    return r.status === 0;
  } catch {
    return false;
  }
}

const PG_PORT_DEFAULT = 5432;
const PG_PORT_ALT = 5433; // fallback if 5432 is in use (e.g. system PostgreSQL)

/** Task name for starting Postgres with least privileges (when app runs as admin). */
const POSTGRES_TASK_NAME = "ZetAsociatiePostgres";

const TASK_WAIT_TIMEOUT_MS = 90000;

/**
 * Start PostgreSQL via a scheduled task with /RL LIMITED so it runs without elevation.
 * Uses a batch file to avoid quoting issues. Returns a promise that resolves to true when the server is accepting TCP on the port.
 */
function startPostgresViaTask(postgresPath, dataDir, port, baseDir) {
  const binDir = path.dirname(postgresPath);
  const binDirWin = binDir.replace(/\//g, "\\");
  const postgresPathWin = postgresPath.replace(/\//g, "\\");
  const dataDirWin = dataDir.replace(/\//g, "\\");
  const batchPath = path.join(baseDir || path.dirname(dataDir), "start-pg.bat");
  const batchContent =
    "@echo off\r\n" +
    "cd /d \"" + binDirWin + "\"\r\n" +
    "\"" + postgresPathWin + "\" -D \"" + dataDirWin + "\" -p " + port + " -h 127.0.0.1\r\n";
  try {
    fs.writeFileSync(batchPath, batchContent, "utf8");
  } catch (e) {
    debugLog.error("[SETUP] Failed to write batch file: " + (e && e.message));
    return Promise.resolve(false);
  }
  debugLog.verbose("[SETUP] Task batch file: " + batchPath);
  const batchPathWin = batchPath.replace(/\//g, "\\");
  let username = process.env.USERNAME || process.env.USER;
  if (username && (!process.env.USERDOMAIN || process.env.USERDOMAIN === process.env.COMPUTERNAME)) {
    username = ".\\" + username;
  } else if (process.env.USERDOMAIN && username) {
    username = process.env.USERDOMAIN + "\\" + username;
  }
  const create = spawnSync(
    "schtasks",
    ["/create", "/tn", POSTGRES_TASK_NAME, "/tr", "\"" + batchPathWin + "\"", "/sc", "once", "/st", "00:00", "/ru", username, "/rl", "LIMITED", "/f"],
    { stdio: "pipe", encoding: "utf8", windowsHide: true }
  );
  if (create.status !== 0) {
    const err = (create.stderr || create.stdout || "").trim();
    debugLog.error("[SETUP] schtasks /create failed (status " + create.status + "): " + err);
    return Promise.resolve(false);
  }
  debugLog.verbose("[SETUP] schtasks /create OK.");
  const run = spawnSync("schtasks", ["/run", "/tn", POSTGRES_TASK_NAME], { stdio: "pipe", encoding: "utf8", windowsHide: true });
  if (run.status !== 0) {
    const err = (run.stderr || run.stdout || "").trim();
    debugLog.error("[SETUP] schtasks /run failed (status " + run.status + "): " + err);
    return Promise.resolve(false);
  }
  debugLog.verbose("[SETUP] schtasks /run OK; waiting for Postgres TCP on port " + port + " (max " + (TASK_WAIT_TIMEOUT_MS / 1000) + "s)...");
  const tcpPromise = waitForPostgresTcp(port);
  const timeoutPromise = new Promise((res) => setTimeout(() => res(false), TASK_WAIT_TIMEOUT_MS));
  return Promise.race([tcpPromise, timeoutPromise]).then((ready) => {
    if (!ready) {
      debugLog.error("[SETUP] Postgres did not become ready on port " + port + " within " + (TASK_WAIT_TIMEOUT_MS / 1000) + "s (task may have failed; check Task Scheduler).");
    }
    return ready;
  });
}

/**
 * Kill the PostgreSQL process listening on the given port (Windows). Used when we started Postgres via task.
 */
function killPostgresOnPort(port) {
  const net = spawnSync("netstat", ["-ano"], { stdio: "pipe", encoding: "utf8", windowsHide: true });
  const out = (net.stdout && String(net.stdout)) || "";
  const lines = out.split("\n");
  let pid = null;
  const portStr = ":" + port;
  for (const line of lines) {
    if (!line.includes(portStr) || !line.includes("LISTENING")) continue;
    const match = line.trim().match(/LISTENING\s+(\d+)/);
    if (match) {
      pid = match[1];
      break;
    }
  }
  if (!pid) return;
  spawnSync("taskkill", ["/pid", pid, "/f"], { stdio: "pipe", windowsHide: true });
  debugLog.verbose("[SETUP] Stopped Postgres (PID " + pid + ") via taskkill.");
}

/** Start Postgres via task and wait for TCP. For use from main process when config.startPostgresViaTask is true. */
function startPostgresViaTaskIfNeeded(postgresBin, postgresDataDir, port) {
  if (process.platform !== "win32") return Promise.resolve(false);
  const baseDir = path.dirname(postgresDataDir);
  return startPostgresViaTask(postgresBin, postgresDataDir, port, baseDir);
}

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
 * Run initdb asynchronously, draining stdout/stderr so the child never blocks on full pipes.
 * Uses TZ=UTC to avoid slow "selecting default time zone" on Windows. Returns { ok, exitCode, stdout, stderr, timedOut }.
 */
function runInitdbAsync(initdbPath, dataDir, binDir, timeoutMs = 120000) {
  return new Promise((resolve) => {
    const env = { ...process.env, PGUSER: "postgres", TZ: "UTC" };
    const child = spawn(initdbPath, ["-D", dataDir, "-U", "postgres", "--encoding=UTF8"], {
      cwd: binDir,
      stdio: ["pipe", "pipe", "pipe"],
      env,
      encoding: "utf8",
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    const timeout = setTimeout(() => {
      if (killed) return;
      killed = true;
      try { child.kill("SIGKILL"); } catch (_) {}
      resolve({ ok: false, exitCode: null, stdout, stderr, timedOut: true });
    }, timeoutMs);
    let killed = false;
    child.on("exit", (code, signal) => {
      if (killed) return;
      killed = true;
      clearTimeout(timeout);
      resolve({
        ok: code === 0,
        exitCode: code ?? signal,
        stdout,
        stderr,
        timedOut: false,
      });
    });
    child.on("error", (err) => {
      if (killed) return;
      killed = true;
      clearTimeout(timeout);
      resolve({ ok: false, exitCode: null, stdout, stderr: stderr + (err && err.message) || "", timedOut: false });
    });
  });
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

  lastSetupFailure = null;
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
    debugLog.verbose("[SETUP] Config will be written to: " + configPath);
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

  const useTaskForPostgres = process.platform === "win32" && isWindowsAdmin();
  if (useTaskForPostgres) {
    debugLog.info("[SETUP] Running as Administrator — will start PostgreSQL via scheduled task (least privileges).");
  }

  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
    debugLog.verbose(`[SETUP] Created directory: ${baseDir}`);
  }

  if (!fs.existsSync(dataDir)) {
    debugLog.info("[SETUP] Step: Running initdb (initializing database cluster)...");
    const initResult = await runInitdbAsync(initdbPath, dataDir, binDir);
    if (!initResult.ok) {
      debugLog.error("[SETUP] Step: initdb — FAILED (exit " + (initResult.exitCode ?? "?") + ")" + (initResult.timedOut ? " [timed out]" : ""));
      const out = (initResult.stdout && String(initResult.stdout).trim()) || "";
      const err = (initResult.stderr && String(initResult.stderr).trim()) || "";
      if (out) debugLog.error("[SETUP] initdb stdout: " + out);
      if (err) debugLog.error("[SETUP] initdb stderr: " + err);
      if (Number(initResult.exitCode) === 3221225781 || Number(initResult.exitCode) === -1073741515) {
        debugLog.error("[SETUP] Exit 3221225781 = Windows STATUS_DLL_NOT_FOUND: a required DLL is missing. Install \"Visual C++ Redistributable for Visual Studio 2015-2022\" (x64) from Microsoft, or place the VC++ DLLs (e.g. vcruntime140.dll, msvcp140.dll) in the same folder as initdb.exe: " + binDir);
      }
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
  let pgPort = null; // Set only when our Postgres actually becomes ready (don't assume 5432 if task failed)
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

    if (useTaskForPostgres) {
      const ready = await startPostgresViaTask(postgresPath, dataDir, tryPort, baseDir);
      if (ready) {
        pgPort = tryPort;
        if (tryPort !== PG_PORT_DEFAULT) {
          debugLog.info("[SETUP] Using port " + tryPort + " (5432 was not available).");
        }
        break;
      }
      debugLog.error("[SETUP] PostgreSQL did not become ready on port " + tryPort + " (task start).");
      if (tryPort === PG_PORT_DEFAULT) {
        debugLog.info("[SETUP] Retrying on port " + PG_PORT_ALT + "...");
      }
      continue;
    }

    postgresProcess = spawnPostgres(tryPort);
    stderrRef = attachPostgresLogging(postgresProcess, tryPort);

    const exitedEarly = await waitForEarlyExit(postgresProcess, stderrRef, tryPort);
    if (exitedEarly) {
      const errText = stderrRef.getStderr();
      const isAdminRefused = errText && /administrative permissions|unprivileged user/i.test(errText);
      if (isAdminRefused) {
        lastSetupFailure = "admin_refused";
        debugLog.error("[SETUP] PostgreSQL refuses to run when the app is run as Administrator. Run the app as a normal user (do not right-click → Run as administrator). Or use external Postgres (install Postgres, set LOCAL_DB_URL).");
      } else {
        debugLog.error("[SETUP] Postgres exited within a few seconds (port " + tryPort + "). Check: missing DLLs in resources/postgres-win/bin, or antivirus.");
      }
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

  // When task failed (e.g. "No mapping between account names and security IDs" on built-in Administrator), try direct spawn once
  if (useTaskForPostgres && !pgPort) {
    debugLog.info("[SETUP] Task could not start Postgres; trying direct spawn (may fail if running as Administrator).");
    for (const tryPort of [PG_PORT_DEFAULT, PG_PORT_ALT]) {
      if (postgresProcess) {
        postgresProcess.kill();
        postgresProcess = null;
        if (fs.existsSync(postmasterPid)) {
          try { fs.unlinkSync(postmasterPid); } catch (_) {}
        }
        await new Promise((r) => setTimeout(r, 1500));
      }
      postgresProcess = spawnPostgres(tryPort);
      stderrRef = attachPostgresLogging(postgresProcess, tryPort);
      const exitedEarly = await waitForEarlyExit(postgresProcess, stderrRef, tryPort);
      if (exitedEarly) {
        const errText = stderrRef.getStderr();
        if (errText && /administrative permissions|unprivileged user/i.test(errText)) lastSetupFailure = "admin_refused";
        postgresProcess = null;
        if (tryPort === PG_PORT_DEFAULT) continue;
        break;
      }
      const ready = await waitForPostgresTcp(tryPort);
      if (ready) {
        pgPort = tryPort;
        useTaskForPostgres = false;
        break;
      }
      postgresProcess.kill();
      postgresProcess = null;
      if (tryPort === PG_PORT_DEFAULT) debugLog.info("[SETUP] Retrying direct spawn on port " + PG_PORT_ALT + "...");
    }
  }

  if (!pgPort) {
    debugLog.error("[SETUP] Step: PostgreSQL server — did not become ready on 5432 or 5433 (task start or spawn).");
    return null;
  }
  const tcpReady = await waitForPostgresTcp(pgPort);
  if (useTaskForPostgres) {
    if (!tcpReady) {
      debugLog.error("[SETUP] Step: PostgreSQL server — did not become ready on port " + pgPort + " (task start).");
      return null;
    }
  } else {
    if (!postgresProcess || !tcpReady) {
      if (postgresProcess) postgresProcess.kill();
      const errText = stderrRef.getStderr();
      if (errText && /administrative permissions|unprivileged user/i.test(errText)) lastSetupFailure = "admin_refused";
      debugLog.error("[SETUP] Step: PostgreSQL server — did not become ready on 5432 or 5433. See stderr above. If it says 'administrative permissions', run the app as a normal user (not as Administrator).");
      return null;
    }
  }

  debugLog.info("[SETUP] Step: PostgreSQL server — ready on port " + pgPort + ".");

  debugLog.verbose("[SETUP] Waiting 3s for Postgres to finish startup...");
  await new Promise((r) => setTimeout(r, 3000));

  let appRoot = app.getAppPath ? app.getAppPath() : process.cwd();
  if (app.isPackaged && appRoot && appRoot.includes("app.asar")) {
    appRoot = appRoot.replace("app.asar", "app.asar.unpacked");
    debugLog.verbose("[SETUP] Using unpacked app path for bootstrap: " + appRoot);
  }
  debugLog.info("[SETUP] Step: Loading bootstrap script...");
  let runBootstrap;
  try {
    runBootstrap = require(path.join(appRoot, "scripts", "electron-db-bootstrap.js")).runBootstrap;
  } catch (err) {
    debugLog.error("[SETUP] Step: Load bootstrap — FAILED: " + err.message);
    if (useTaskForPostgres) killPostgresOnPort(pgPort);
    else if (postgresProcess) postgresProcess.kill();
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

  if (useTaskForPostgres) killPostgresOnPort(pgPort);
  else if (postgresProcess) postgresProcess.kill();
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
    if (useTaskForPostgres) config.startPostgresViaTask = true;
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
  getLastSetupFailure,
  startPostgresViaTaskIfNeeded,
  killPostgresOnPort,
};
