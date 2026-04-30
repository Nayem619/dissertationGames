# Host Snake + Gem Match on Vercel (simple guide)

The Expo app loads these games in a **WebView** using **full https URLs** from your computer’s `.env` file. You do **not** paste the URL into the code — only into `.env`.

**What you need:** a GitHub account, an email, and a few minutes. Vercel’s free plan is enough.

---

## 1) Create a Vercel account

1. Open [https://vercel.com](https://vercel.com) in a browser.
2. Click **Sign up** (or **Log in** if you already have an account).
3. Choose **Continue with GitHub** and let Vercel connect to your GitHub.  
   Vercel needs this so it can read your code from GitHub and build it in the cloud.

You now have a Vercel account. Nothing else to install for hosting.

---

## 2) Push the project to GitHub (if it is not there yet)

1. On your machine, put the `dissertationGames` project on GitHub (you can create a new empty repo on GitHub and `git push` your code).  
2. The folders that matter for Vercel are inside **`web-games/`** (for example `phaser3-snake-cordova` and `phaser3-match3`).

Your friend can push; you only need the repo to exist on GitHub before importing it in Vercel.

---

## 3) Game A — Gem Match (match-3, prebuilt in `dist/`)

This is the **easier** one: the built files are already in **`phaser3-match3/dist`**.

1. In Vercel, go to the **Dashboard** and click **Add New…** → **Project** (or **Import Project**).
2. **Import** your **Git** repository (the one with `web-games`).
3. Vercel will ask for project settings. Set:
   - **Project name** — anything, e.g. `nexus-gem-match`.
   - **Root directory** — click “Edit” and set it to:  
     `web-games/phaser3-match3`  
     (This means “only use this subfolder of the repo as the Vercel project.”)
4. **Framework preset** — choose **Other** (or Vite / Static; it does not need a special framework if we only serve static files).
5. **Build command** — leave **empty** (or use `echo` if the UI requires something; prebuilt `dist` does not need a build in many setups).
6. **Output directory** — set to: **`dist`**  
   (Vercel will publish the contents of `dist` as the site root.)
7. If Vercel insists on a build, use **Build command** `true` and **Output** `dist` — or in **Project** → **Settings** → **General**, set **Output Directory** to `dist` after the first import.

8. Click **Deploy**. When it turns green, open the project → you will get a live URL like `https://nexus-gem-match.vercel.app`.

9. **Test in a phone browser** — open that URL. You should see the match-3 game.  
   **Copy the full `https://…` link** (no space at the end).

10. In the **Expo app** folder on the machine you use for development, create or edit **`.env`** in the project root (same place as `package.json` for the Expo app):

    ```env
    EXPO_PUBLIC_GEM_MATCH_URL=https://YOUR-PROJECT.vercel.app
    ```

    Replace with your real URL. No trailing slash.

11. **Restart** Expo: stop the dev server, then run e.g. `npx expo start --clear` so it picks up env vars.

12. In the app, go to **Gem Match** (home card or `Snake` hub). The app opens that URL in a WebView. If the env var is missing, the app shows a short “URL not set” message.

---

## 4) Game B — Snake (Phaser Cordova, needs `npm run build`)

The Snake game lives in **`web-games/phaser3-snake-cordova`**. Webpack outputs to **`www/`** (not `dist`).

1. **New Vercel project** (or same repo, second project) → **Import** the same GitHub repo.
2. **Root directory** — `web-games/phaser3-snake-cordova`
3. **Build command** — `npm install && npm run build`
4. **Output directory** — `www`
5. **Node version** — this project uses old tools (`node-sass`, etc.). In the repo we added **`vercel.json`** in that folder. If the build still fails, in Vercel go to **Settings** → **Environment variables** and add:
   - Name: `NODE_VERSION` (or use **Node.js Version** in project settings, depending on the Vercel UI)
   - Value: `14` (try `14` first, then `16` if 14 is unavailable)

6. **Deploy** and open the production URL. You should see the Cordova/Phaser snake game. **Copy the `https://…` URL**.

7. In the Expo app **`.env`**:

    ```env
    EXPO_PUBLIC_SNAKE_URL=https://YOUR-SNAKE-PROJECT.vercel.app
    ```

8. **Restart** Expo with `--clear` as above.

9. In the app, open **Snake** → the hub can show “Snake remote: on” when this variable is set; **Play** uses the Vercel build instead of the small bundled example.

If you **do not** set `EXPO_PUBLIC_SNAKE_URL`, Snake still works using the **bundled** Phaser HTML (CDN assets).

---

## 5) Security and HTTPS

- Use **`https://`** only (Vercel gives this by default).
- Do not put **secrets** in `.env` names that start with `EXPO_PUBLIC_` — they are bundled into the app. Game URLs are fine to expose.

---

## 6) If something goes wrong

| Problem | What to check |
|--------|----------------|
| **Blank WebView** | Open the same URL in Safari/Chrome on the phone. If it fails, fix the Vercel URL or CORS (Phaser games are usually static; rare issues). |
| **Old env not updated** | Stop Expo, run `npx expo start --clear`, rebuild the dev client if you use a custom dev build. |
| **Snake build failed on Vercel** | Read the Vercel **Build** log. Often **Node 14/16** fixes `node-sass` issues. |
| **Gem match 404** | **Root** must be `phaser3-match3` and **output** `dist` so `index.html` is at the site root. |

---

## 7) Quick copy-paste for `.env` (Expo)

Create `.env` next to the Expo `package.json`:

```env
EXPO_PUBLIC_SNAKE_URL=
EXPO_PUBLIC_GEM_MATCH_URL=
```

Fill in after each deploy. See **`.env.example`** in the repo for the same keys.

You can also copy the example file: `cp .env.example .env` then edit `.env` with the real URLs.

---

That’s the full path: **GitHub** → **Vercel (root + build/output)** → **copy https URL** → **`.env` in the Expo app** → **restart Expo**.
