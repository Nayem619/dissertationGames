#!/usr/bin/env node
if (process.env.RENDER !== "true") {
  process.exit(0);
}

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const distIndex = path.join(__dirname, "..", "dist", "index.html");
if (fs.existsSync(distIndex)) {
  console.log("[render-postinstall] dist/ already exists, skipping export");
  process.exit(0);
}

console.log("[render-postinstall] Running expo export --platform web …");
execSync("npx expo export --platform web", {
  stdio: "inherit",
  cwd: path.join(__dirname, ".."),
  env: process.env,
});
