#!/usr/bin/env node
/**
 * Host ./dist after `expo export --platform web`.
 * Node stdlib only — avoids spawning `serve` (child can exit immediately → Render 502).
 */
const fs = require("fs");
const http = require("http");
const path = require("path");

const dist = path.resolve(path.join(__dirname, "..", "dist"));

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json",
  ".webmanifest": "application/manifest+json",
  ".wasm": "application/wasm",
};

/** URL path → absolute path under dist; null if traversal / invalid */
function resolvedPathWithinDist(reqUrl) {
  let pathname = "/";
  try {
    pathname = new URL(reqUrl || "/", "http://0.0.0.0").pathname;
  } catch {
    return null;
  }
  let relative = pathname === "/" ? "index.html" : pathname.slice(1);
  if (relative.endsWith("/")) relative += "index.html";
  relative = path.normalize(relative.replace(/\0/g, ""));
  const full = path.resolve(path.join(dist, relative));
  const relCheck = path.relative(dist, full);
  if (relCheck.startsWith("..") || path.isAbsolute(relCheck)) return null;
  return full;
}

function serveFile(absPath, res) {
  const ext = path.extname(absPath).toLowerCase();
  fs.readFile(absPath, (err, buf) => {
    if (err) {
      res.writeHead(500);
      res.end();
      return;
    }
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": "public, max-age=86400",
    });
    res.end(buf);
  });
}

function fallbackIndexHtml(res) {
  const ix = path.join(dist, "index.html");
  if (!fs.existsSync(ix)) {
    res.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("dist/index.html missing");
    return;
  }
  serveFile(ix, res);
}

function handle(req, res) {
  const full = resolvedPathWithinDist(req.url || "/");
  if (!full) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.stat(full, (err, st) => {
    if (!err && st.isFile()) {
      serveFile(full, res);
      return;
    }
    if (!err && st.isDirectory()) {
      const ix = path.join(full, "index.html");
      if (fs.existsSync(ix)) {
        serveFile(ix, res);
        return;
      }
    }

    fallbackIndexHtml(res);
  });
}

if (!fs.existsSync(path.join(dist, "index.html"))) {
  console.error("[render-serve] Missing dist/index.html — run expo export web first.");
  process.exit(1);
}

const port = parseInt(process.env.PORT, 10);
if (!Number.isFinite(port) || port < 1) {
  console.error("[render-serve] $PORT invalid:", process.env.PORT);
  process.exit(1);
}

const server = http.createServer(handle);
server.keepAliveTimeout = 65000;
server.listen(port, "0.0.0.0", () => {
  console.log("[render-serve]", `listen http://0.0.0.0:${port}`, "dist=", dist);
});

server.on("error", (err) => {
  console.error("[render-serve] listen failed", err);
  process.exit(1);
});
