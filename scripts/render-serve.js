#!/usr/bin/env node
/**
 * Render (and similar) must NOT use package.json "main" (expo-router/entry) as the process entry.
 * After `expo export --platform web`, we only serve ./dist.
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const indexHtml = path.join(root, "dist", "index.html");

if (!fs.existsSync(indexHtml)) {
  console.error(
    "[render-serve] Missing dist/index.html. Run `npx expo export --platform web` (or full Render build) first."
  );
  process.exit(1);
}

const port = String(process.env.PORT || "3000").trim() || "3000";
const listen = `tcp://0.0.0.0:${port}`;

const serveBin = path.join(root, "node_modules", ".bin", "serve");
const cmd = fs.existsSync(serveBin) ? serveBin : "npx";
const args = fs.existsSync(serveBin) ? ["dist", "-s", "-l", listen] : ["serve", "dist", "-s", "-l", listen];

const r = spawnSync(cmd, args, {
  cwd: root,
  stdio: "inherit",
  shell: process.platform === "win32" && cmd === "npx",
  env: process.env,
});

process.exit(r.status === null ? 1 : r.status);
