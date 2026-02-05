"use strict";

const fs = require("node:fs");
const path = require("node:path");

let logPath = null;
let logStream = null;
let logStreamPath = null;
let appRef = null;
let useAppRoot = true; // when true and packaged, log goes to app root (e.g. C:\Program Files\Admin Membri)

function getLogPath() {
  if (logPath && appRef !== undefined) return logPath;
  try {
    let dir = null;
    if (appRef && typeof appRef.getPath === "function") {
      if (useAppRoot && appRef.isPackaged) {
        dir = path.dirname(appRef.getPath("exe"));
      } else {
        dir = appRef.getPath("userData");
      }
    }
    if (!dir && process.platform === "win32" && process.env.APPDATA) {
      dir = path.join(process.env.APPDATA, "Admin Membri");
    }
    if (!dir && process.platform === "darwin") {
      dir = path.join(process.env.HOME || "", "Library", "Application Support", "Admin Membri");
    }
    if (!dir) {
      dir = process.cwd();
    }
    logPath = path.join(dir, "debug.log");
    return logPath;
  } catch (e) {
    logPath = path.join(process.cwd(), "debug.log");
    return logPath;
  }
}

function ensureStream() {
  const targetPath = getLogPath();
  if (logStream && logStreamPath === targetPath) return;
  try {
    if (logStream) {
      try { logStream.end(); } catch (_) {}
      logStream = null;
      logStreamPath = null;
    }
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    logStream = fs.createWriteStream(targetPath, { flags: "a" });
    logStreamPath = targetPath;
    logStream.on("error", () => {});
  } catch (e) {
    if (useAppRoot && e.code === "EACCES") {
      useAppRoot = false;
      logPath = null;
      ensureStream();
      write("WARN", `Could not write to app directory (EACCES); using fallback: ${getLogPath()}`);
    }
  }
}

function formatMessage(level, msg) {
  const ts = new Date().toISOString();
  const line = typeof msg === "string" ? msg : (msg instanceof Error ? msg.stack || msg.message : JSON.stringify(msg));
  return `[${ts}] [${level}] ${line}\n`;
}

function write(level, msg) {
  try {
    ensureStream();
    if (logStream && logStream.writable) {
      logStream.write(formatMessage(level, msg));
    }
  } catch (_) {}
  if (level === "ERROR" || level === "WARN") {
    console.error(msg);
  } else {
    console.log(msg);
  }
}

module.exports = {
  init(app) {
    appRef = app;
    logPath = null;
    if (logStream) {
      try { logStream.end(); } catch (_) {}
      logStream = null;
    }
    getLogPath();
    ensureStream();
    this.info(`Debug log file (verbose): ${getLogPath()}`);
    this.verbose(`Platform: ${process.platform}, execPath: ${process.execPath}`);
  },

  log(level, msg) {
    write(level || "INFO", msg);
  },

  info(msg) {
    this.log("INFO", msg);
  },

  verbose(msg) {
    this.log("VERBOSE", msg);
  },

  error(msg) {
    this.log("ERROR", msg);
  },

  warn(msg) {
    this.log("WARN", msg);
  },

  getLogPath() {
    return getLogPath();
  },
};
