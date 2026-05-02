# Deploy vendor games (Render) — no LAN

Push to Render **when** you are ready for **anyone with your Expo build** to load Chess / Ludo without running servers on your laptop. Until then, Expo can keep using localhost for simulators only.

## What to put on Render

### Chessu (`vendor/chessu`)

Treat it like upstream: **frontend and API are two different URLs** (their README used Vercel + Railway; on Render you use **two Web Services** + **PostgreSQL**).

| Service | Root / build | Start | Env you must set |
|--------|----------------|-------|------------------|
| **API** | Repo `vendor/chessu` | `pnpm install` → `pnpm build:server` → `pnpm --filter server start` | `PORT` (Render sets this), Postgres (`server/.env` style: `PGHOST`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, etc.), session/cookies per upstream `server` README |
| **Next UI** | Repo `vendor/chessu` | `pnpm install` → `pnpm build:client` → `pnpm --filter client start` | `PORT` (Render), **`NEXT_PUBLIC_API_URL=https://YOUR-API.onrender.com`** (no trailing slash) |

**Important:** `NEXT_PUBLIC_API_URL` is **baked into the Next build**. Set it on the **Next** service’s Render env, then rebuild when the API URL changes.

### MERN Ludo (`vendor/mern-ludo`)

| Service | Build | Start | Env |
|--------|--------|-------|-----|
| **Socket / API** | `vendor/mern-ludo/backend`: `npm install` | `node server.js` (or `npm start` if defined) | **`PORT`** (Render assigns; can be 10000 — app does not assume 8080 in production if you use env below), **`MONGO_URI`**, **`CORS_ORIGINS`** = comma list including your **CRA site’s public origin** (e.g. `https://YOUR-LUDO-UI.onrender.com`) |
| **CRA UI** | `vendor/mern-ludo`: `npm install` → `npm run build` | Static publish **`build/`** (Render **Static Site**) **or** serve with a static file server | **`REACT_APP_SOCKET_URL=https://YOUR-LUDO-API.onrender.com`** (no path; Socket.IO uses that origin). Baked in at **build** time. |

The repo’s `App.js` reads `REACT_APP_SOCKET_URL` so the WebView (HTTPS) can talk to your backend on its own URL instead of `hostname:8080`.

## Configure the Play Hub (Expo app)

After both **public HTTPS** UI URLs exist:

1. In **EAS / CI / local** env for `expo export` or EAS Build, set:

   - `EXPO_PUBLIC_VENDOR_CHESS_URL=https://YOUR-CHESS-NEXT.onrender.com`
   - `EXPO_PUBLIC_VENDOR_LUDO_URL=https://YOUR-LUDO-STATIC.onrender.com`

2. Rebuild or re-export the app so those values are embedded (Expo bakes `EXPO_PUBLIC_*` at build time).

3. **Firebase Auth** (if you use authorized domains): add the Render UI hostnames if you open them in a system browser; WebView may still need cookie/session rules depending on the vendor app.

## Invite / play together

Friends use the **same** deployed chessu + Ludo stacks. Your Expo app is only a shell that opens those URLs in a WebView; multiplayer is whatever the vendor backends provide (rooms, links, etc.).

## Checklist

- [ ] Postgres for chessu API; Mongo for Ludo API  
- [ ] Chess API deployed; `NEXT_PUBLIC_API_URL` on Next build points to it  
- [ ] Ludo API deployed; `CORS_ORIGINS` includes Ludo UI HTTPS origin  
- [ ] Ludo UI built with `REACT_APP_SOCKET_URL` = Ludo API HTTPS origin  
- [ ] Expo `EXPO_PUBLIC_VENDOR_*` = two **UI** HTTPS URLs; new app build/export  
