/**
 * Next.js standalone does not include .next/static or public by default.
 * Copy them into .next/standalone so the server can serve JS, CSS, and fonts.
 * Run after `next build` when building for Electron (or any standalone deploy).
 */
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const standaloneDir = path.join(root, ".next", "standalone");
const staticSrc = path.join(root, ".next", "static");
const staticDst = path.join(standaloneDir, ".next", "static");
const publicSrc = path.join(root, "public");
const publicDst = path.join(standaloneDir, "public");

if (!fs.existsSync(standaloneDir)) {
  console.error("No .next/standalone found. Run 'next build' first.");
  process.exit(1);
}

if (fs.existsSync(staticSrc)) {
  fs.cpSync(staticSrc, staticDst, { recursive: true });
  console.log("Copied .next/static -> .next/standalone/.next/static");
} else {
  console.warn("No .next/static found.");
}

if (fs.existsSync(publicSrc)) {
  fs.cpSync(publicSrc, publicDst, { recursive: true });
  console.log("Copied public -> .next/standalone/public");
}

console.log("Standalone static assets ready.");
