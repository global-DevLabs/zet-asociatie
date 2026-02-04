"use strict";

const fs = require("node:fs");
const path = require("node:path");

let logPath = null;
let logStream = null;
let appRef = null;

function getLogPath() {
  if (logPath) return logPath;
  try {
    let dir = null;
    if (appRef && typeof appRef.getPath === "function") {
      dir = appRef.getPath("userData");
    }
    if (!dir && process.platform === "win32" && process.env.APPDATA) {
      dir = path.join(process.env.APPDATA, "Zet Asociatie");
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
  if (logStream) return;
  try {
    const dir = path.dirname(getLogPath());
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    logStream = fs.createWriteStream(getLogPath(), { flags: "a" });
  } catch (e) {
    // no-op
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
  if (level === "ERROR") {
    console.error(msg);
  } else {
    console.log(msg);
  }
}

module.exports = {
  init(app) {
    appRef = app;
    getLogPath();
    ensureStream();
    this.info(`Debug log file: ${getLogPath()}`);
  },

  log(level, msg) {
    write(level || "INFO", msg);
  },

  info(msg) {
    this.log("INFO", msg);
  },

  error(msg) {
    this.log("ERROR", msg);
  },

  getLogPath() {
    return getLogPath();
  },
};
