# Third-party multiplayer game sources

Pinned **shallow git clones** (run `git pull --unshallow` inside a folder only if you need full history).

## Chess — `chessu/`

- **Upstream:** https://github.com/dotnize/chessu  
- **License:** MIT (see `chessu/LICENSE`)  
- **Why:** Popular, maintained stack (**Next.js 14**, **react-chessboard**, **chess.js**, **socket.io**, optional PostgreSQL), spectate/chat, accounts optional.  
- **Run (dev):** Install [pnpm](https://pnpm.io), then from `chessu/`: `pnpm install`, configure `server/.env` with Postgres, run `pnpm dev` (see upstream README).

## Ludo — `mern-ludo/`

- **Upstream:** https://github.com/Wenszel/mern-ludo  
- **License:** No `LICENSE` file in repo — treat as upstream default copyright; integrate only with explicit permission if you publish a derivative.  
- **Why:** **MERN + Socket.IO** multiplayer, tests/Docker/AWS story, React + MongoDB sessions.  
- **Run:** From `mern-ludo/`: set MongoDB URI in `backend/.env`, `npm i` / `npm start` as in upstream README, start `backend/server.js`.

**Arcade (Play Hub)** only lists **Phaser** mini-games (`app/Arcade/`). Chessu / MERN Ludo under **`vendor/`** are standalone reference trees for your own deployment. **`[RENDER.md](./RENDER.md)`** · **`[ARCADE_LOCAL_DEV.md](./ARCADE_LOCAL_DEV.md)`**.
