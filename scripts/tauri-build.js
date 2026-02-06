/**
 * Tauri build script: temporarily moves API routes and auth callback
 * outside app/ so Next.js static export (output: 'export') can succeed.
 * These routes are not used in Tauri - the app uses db-adapter directly.
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const rootDir = path.join(__dirname, "..");
const appDir = path.join(rootDir, "app");
const hideDir = path.join(rootDir, ".tauri-build-hide");
const apiPath = path.join(appDir, "api");
const authPath = path.join(appDir, "auth");
const apiHide = path.join(hideDir, "api");
const authHide = path.join(hideDir, "auth");

function exists(p) {
  return fs.existsSync(p);
}

function restore() {
  if (exists(apiHide)) {
    fs.renameSync(apiHide, apiPath);
    console.log("Restored app/api");
  }
  if (exists(authHide)) {
    fs.renameSync(authHide, authPath);
    console.log("Restored app/auth");
  }
  if (exists(hideDir)) {
    try {
      fs.rmdirSync(hideDir, { recursive: true });
    } catch (_) {}
  }
}

try {
  if (exists(apiPath)) {
    fs.mkdirSync(hideDir, { recursive: true });
    fs.renameSync(apiPath, apiHide);
    console.log("Moved app/api for Tauri build");
  }
  if (exists(authPath)) {
    if (!exists(hideDir)) fs.mkdirSync(hideDir, { recursive: true });
    fs.renameSync(authPath, authHide);
    console.log("Moved app/auth for Tauri build");
  }

  execSync("npm run build", {
    stdio: "inherit",
    env: { ...process.env, TAURI_ENV_PLATFORM: "1" },
  });
} finally {
  restore();
}
