/**
 * Verify Windows (and general) build environment for Electron + native modules.
 * Run before building on Windows: node scripts/verify-windows-env.js
 *
 * Checks: Node version, npm, npm config (python, msvs_version), optional Python in PATH.
 * Does not install anything; reports status and hints.
 */
"use strict";

const { execSync } = require("node:child_process");
const os = require("node:os");

const MIN_NODE_MAJOR = 18;
const isWindows = os.platform() === "win32";

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { encoding: "utf8", ...opts }).trim();
  } catch {
    return null;
  }
}

function ok(label, value, note = "") {
  const v = value ?? "(lipsă)";
  console.log(`  ✓ ${label}: ${v}${note ? `  ${note}` : ""}`);
}

function fail(label, value, hint = "") {
  const v = value ?? "(lipsă)";
  console.log(`  ✗ ${label}: ${v}`);
  if (hint) console.log(`    → ${hint}`);
}

function section(title) {
  console.log("");
  console.log(`--- ${title} ---`);
}

let hasErrors = false;

console.log("Verificare mediu de build (Windows / Node + native modules)");
console.log("Platform: " + os.platform() + " " + os.release());

// Node
section("Node.js");
const nodeVer = run("node -v");
const nodeMajor = nodeVer ? parseInt((nodeVer.match(/^v?(\d+)/) || [])[1], 10) : 0;
if (nodeVer && nodeMajor >= MIN_NODE_MAJOR) {
  ok("node", nodeVer, `(min ${MIN_NODE_MAJOR})`);
} else {
  fail("node", nodeVer || "not found", `Instalați Node.js v${MIN_NODE_MAJOR}+ de la https://nodejs.org/`);
  hasErrors = true;
}

// npm
section("npm");
const npmVer = run("npm -v");
if (npmVer) {
  ok("npm", npmVer);
} else {
  fail("npm", null, "Instalați Node.js (include npm).");
  hasErrors = true;
}

// npm config: python (for node-gyp) — required on Windows for native modules
section("npm config (pentru module native / node-gyp)");
const npmPython = run("npm config get python");
const pythonSet = npmPython && npmPython !== "undefined" && npmPython !== "null";
if (pythonSet) {
  ok("npm config get python", npmPython);
} else if (isWindows) {
  fail(
    "npm config get python",
    npmPython || "undefined",
    "Setați: npm config set python \"C:\\Path\\To\\python.exe\" (sau instalați Python 3.x și adăugați în PATH)"
  );
  hasErrors = true;
} else {
  ok("npm config get python", npmPython || "(optional off Windows)", "Not required on this platform for Windows build.");
}

// npm config: msvs_version (Windows)
const npmMsvs = run("npm config get msvs_version");
const msvsSet = npmMsvs && npmMsvs !== "undefined" && npmMsvs !== "null";
if (isWindows) {
  if (msvsSet) {
    ok("npm config get msvs_version", npmMsvs);
  } else {
    fail(
      "npm config get msvs_version",
      npmMsvs || "undefined",
      "Setați versiunea Visual Studio, ex: npm config set msvs_version 2022 (sau 2019). Necesar pentru compilare module native."
    );
    hasErrors = true;
  }
} else {
  ok("npm config get msvs_version", "(N/A, not Windows)");
}

// Optional: python in PATH (Windows)
if (isWindows) {
  section("Python în PATH (opțional)");
  const wherePython = run("where python 2>nul");
  if (wherePython) {
    ok("where python", wherePython.split("\n")[0]);
  } else {
    console.log("  (where python nu a găsit nimic; asigurați-vă că Python e în PATH dacă npm config python nu e setat)");
  }
}

// Hints
section("Recomandări Windows");
if (isWindows) {
  console.log("  • Python 3.x: https://www.python.org/downloads/ sau Microsoft Store");
  console.log("  • Visual Studio Build Tools (cu \"Desktop development with C++\"):");
  console.log("    https://visualstudio.microsoft.com/visual-cpp-build-tools/");
  console.log("  • Sau Visual Studio 2019/2022 cu workload C++");
  console.log("  • Pentru PC-uri unde doar SE INSTALEAZĂ aplicația (nu se face build):");
  console.log("    Visual C++ Redistributable (x64) poate fi necesar:");
  console.log("    https://aka.ms/vs/17/release/vc_redist.x64.exe");
}

section("Rezultat");
if (hasErrors) {
  console.log("  Unele verificări au eșuat. Remediați elementele marcate cu ✗ înainte de npm install / npm run build.");
  process.exit(1);
} else {
  console.log("  Toate verificările configurate au trecut. Puteți rula npm install și npm run build.");
  process.exit(0);
}
