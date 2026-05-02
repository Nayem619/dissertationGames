# Standalone Chessu & MERN Ludo (deploy only)

The **Play Hub Arcade no longer opens** Chess or Ludo in-app (embedded WebViews were removed).

Use this doc only if you want to host **`vendor/chessu`** and **`vendor/mern-ludo`** yourself (browser, iframe, separate product, dissertation infra, etc.). Blueprint **`render.yaml`** still includes optional **`dissertationgames-ludo`** (Docker).

## Ludo on Render (`dissertationgames-ludo`)

MongoDB Atlas:

1. Cluster + DB user (`CONNECTION_URI` / `mongodb+srv://…`)
2. **Network Access:** allow **`0.0.0.0/0`** for Render egress (or tighter IP rules later).

Render:

- **`CONNECTION_URI`** on the **`dissertationgames-ludo`** service (from blueprint or manual Docker service)
- Dockerfile: **`vendor/mern-ludo/Dockerfile`**, context **`vendor/mern-ludo`**

See **`vendor/mern-ludo/backend/.env.example`** for **`CORS_ORIGINS`**, **`SESSION_SECRET`**.

## Chessu

Upstream **chessu** is a separate Next.js + Postgres API stack (`vendor/chessu/`). Deploy per that repo’s README if you want a public chess UI.
