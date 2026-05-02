# Vendor games — what actually runs today

## Chess

The Play Hub **`EXPO_PUBLIC_VENDOR_CHESS_URL`** defaults to **`https://ches.su`** (public chessu deployment). Override in `.env` / Render if you self-host (`vendor/chessu`).

## Ludo — `dissertationgames-ludo.onrender.com`

Blueprint **`render.yaml`** adds a Docker web service **`dissertationgames-ludo`** that builds the CRA UI and serves it from **`vendor/mern-ludo/backend/server.js`** (same HTTPS origin as Socket.IO — no `:8080` split in production).

Before the service stays healthy:

1. Create **MongoDB Atlas** (free tier): database user + connection string (**`mongodb+srv://…`**).
2. In Render → **`dissertationgames-ludo`** → Environment → add **`CONNECTION_URI`** = that Atlas URI (**same name** mongoose + session store use).
3. **Network access**: Atlas IP allowlist **0.0.0.0/0** (or Render’s egress docs) until you tighten it.
4. Optional: **`SESSION_SECRET`** overrides the default; the blueprint may auto-generate one.

Rebuild **`dissertationgames-web`** after you change vendor URLs, or rely on baked-in **`lib/vendorArcade.js`** fallbacks (**`ches.su`** / **`dissertationgames-ludo.onrender.com`**).

### Split deploy (optional)

You can still run CRA static + API on different hosts and set **`REACT_APP_SOCKET_URL`** at CRA build — see **`App.js`** `socketOrigin()`.
