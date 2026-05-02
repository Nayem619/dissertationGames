# Run Chess / Ludo locally (`vendor/`)

The **Play Hub Arcade does not embed** these games anymore — run them in **browser** for local testing only.

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
     Open **`http://192.168.1.42:3000`** in a phone browser when testing chessu remotely.

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

5. CRA dev URL is **`http://localhost:3000`**, **`http://10.0.2.2:3000`** (Android emu), or **`http://YOUR_LAN_IP:3000`** (phone browser). Socket client defaults to **`window.location.hostname`** and port **8080** locally.

---

## Render / production

Publish chessu / Ludo on **HTTPS**, then browse each URL standalone (Arcade lists Phaser titles only inside the Expo app).
