# Run Chess / Ludo for the Expo app (local test)

Defaults in the Expo app assume **http://localhost:3000** for both Chess and Ludo UIs (`EXPO_PUBLIC_VENDOR_CHESS_URL`, `EXPO_PUBLIC_VENDOR_LUDO_URL`). Override in `.env` if you need another host/port.

---

## Chess (`vendor/chessu`)

1. Install [pnpm](https://pnpm.io) and Node ≥ 20.

2. In `vendor/chessu/server/`, create `.env` with PostgreSQL vars (see repo README).

3. **API URL baked into Next:** from `vendor/chessu`, start with your machine’s reachable host:

   - **iOS Simulator / same machine**:  
     `NEXT_PUBLIC_API_URL=http://localhost:3001`
   - **Android emulator**:  
     `NEXT_PUBLIC_API_URL=http://10.0.2.2:3001`
   - **Physical device on Wi‑Fi** (your laptop is e.g. `192.168.1.42`):  
     `NEXT_PUBLIC_API_URL=http://192.168.1.42:3001`  
     Set in the **Expo** `.env` the same host for **`EXPO_PUBLIC_VENDOR_CHESS_URL=http://192.168.1.42:3000`**.

4. Install and run:

   ```bash
   cd vendor/chessu && pnpm install && NEXT_PUBLIC_API_URL=http://localhost:3001 pnpm dev
   ```

   Client ·3000 · server ·3001 per upstream defaults.

---

## Ludo (`vendor/mern-ludo`)

1. **MongoDB:** In `vendor/mern-ludo/backend/`, copy `.env.example` to `.env`. Set **`MONGO_URI`** and **`PORT=8080`**.

2. Optional: **`CORS_ORIGINS`** comma list must include wherever the CRA app is opened from, e.g.  
   `http://localhost:3000,http://10.0.2.2:3000,http://YOUR_LAN_IP:3000`

3. Backend:

   ```bash
   cd vendor/mern-ludo/backend && npm install && node server.js
   ```

   (Ensure `PORT=8080` in `.env`.)

4. Frontend (CRA, port **3000**):

   ```bash
   cd vendor/mern-ludo && npm install && npm start
   ```

5. Expo app **`EXPO_PUBLIC_VENDOR_LUDO_URL`** must match that UI origin (`http://localhost:3000`, `http://10.0.2.2:3000`, or `http://YOUR_LAN_IP:3000`).  
   Socket client uses **`window.location.hostname`** and port **8080** — same LAN IP applies automatically once the WebView loads the right UI URL.

---

## Render later

Bake **`EXPO_PUBLIC_VENDOR_CHESS_URL`** / **`EXPO_PUBLIC_VENDOR_LUDO_URL`** as your **HTTPS** Render URLs after you deploy both frontends (and backends) there.
