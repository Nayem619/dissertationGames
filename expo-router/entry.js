#!/usr/bin/env node
/**
 * Platforms that copy Start Command from package.json "main" often run literally:
 *   node expo-router/entry
 * which must resolve to a FILE, not node_modules/expo-router. This shim forwards to
 * the static web host after `expo export`. Metro bundles still use node_modules/expo-router
 * (pinned in metro.config.js).
 */

const path = require("path");
const { startRenderWebServer } = require(path.join(__dirname, "..", "scripts", "render-serve"));

startRenderWebServer({ repoRoot: path.join(__dirname, "..") });
