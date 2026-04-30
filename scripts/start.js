#!/usr/bin/env node
const { spawnSync } = require("child_process");

if (process.env.RENDER === "true") {
  const r = spawnSync("npm", ["run", "start:render"], {
    stdio: "inherit",
    shell: true,
    env: process.env,
  });
  process.exit(r.status ?? 1);
}

const r = spawnSync("npx", ["expo", "start"], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});
process.exit(r.status ?? 1);
