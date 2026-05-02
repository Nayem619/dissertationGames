# Chess + Ludo: get both working

## Chess (almost nothing to do)

Chess in the app loads **`https://ches.su`** in a WebView by default (see **`lib/vendorArcade.js`**).

1. Pull latest **`main`** and run the app (or use the web build on Render).
2. Open **Arcade → Chess**. You do **not** need Mongo, Postgres, or a Render service for chess **unless** you want your own copy of chessu.

To use your own chess host later, set **`EXPO_PUBLIC_VENDOR_CHESS_URL`** to your Next URL and rebuild.

---

## Ludo (MongoDB Atlas + Render)

Ludo is your service **`dissertationgames-ludo`** (from **`render.yaml`**). It needs a **Mongo connection string** env var named **`CONNECTION_URI`**.

### Step 1 — Atlas project and cluster

1. Go to **[cloud.mongodb.com](https://cloud.mongodb.com)** and sign in (or create an account).
2. **Create a project** (any name, e.g. `dissertation`).
3. **Build a database** → choose the **free M0** tier → pick a cloud region (close to you is fine).
4. Create the cluster and wait until it shows **Active**.

### Step 2 — Database user

1. Atlas → **Database** → your cluster → **Connect**.
2. Create a **database user** (username + password). **Save the password** — you will not see it again.
3. **Where it asks Network Access**, choose **Allow access from anywhere** temporarily (this adds **`0.0.0.0/0`**).

**Why `0.0.0.0/0`?** Render’s servers use **changing outbound IPs**. Until you configure a fixed IP/VPC-style setup, Atlas must allow **all IPs** so Render can reach Mongo.

**Manual path if Connect didn’t add it:**

1. Left sidebar → **Network Access** (sometimes under **Security**).
2. **Add IP Address** → **Allow access from anywhere** → confirm (**`0.0.0.0/0`**).

### Step 3 — Connection string (`mongodb+srv://…`)

1. **Database → Connect → Drivers** (or **Connect your application**).
2. Copy the **SRV connection string**. It looks like:  
   `mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/`  
3. Replace **`<password>`** (or **`PASSWORD`**) with your database user password. If the password contains special characters (`@`, `#`, `:`, `/`), **[URL-encode it](https://www.urlencoder.org/)** inside the URI.
4. **Append a database name** so sessions and Mongoose land in one DB, e.g.  
   `...mongodb.net/playhub-ludo?retryWrites=true&w=majority`  
   (the name before `?` can be anything you like, e.g. `playhub-ludo`.)

That full string is your **`CONNECTION_URI`**.

---

### Step 4 — Paste into Render

1. Open **[dashboard.render.com](https://dashboard.render.com)** → your **`dissertationgames-ludo`** service.
2. **Environment** tab → **Environment Variables**.
3. **Add** variable:
   - **Key:** `CONNECTION_URI`  
   - **Value:** paste the full `mongodb+srv://…` string (no extra quotes).
4. **Save**. Render will redeploy; wait until logs show **`MongoDB Connected…`** and **`mern-ludo listening`**.

If the service was never created from the blueprint, push **`render.yaml`** and use **Blueprint sync** so **`dissertationgames-ludo`** exists.

---

### Step 5 — Play Hub URLs (already wired in repo)

Defaults in code / **`render.yaml`**:

- Chess: **`https://ches.su`**
- Ludo: **`https://dissertationgames-ludo.onrender.com`**

After Ludo is green, redeploy **`dissertationgames-web`** once so **`expo export`** bakes the same vendor URLs if you changed them in Render env.

Mobile / Expo: **`npx expo start -c`** after pulling **`main`** if you rely on bundled defaults via **`vendorArcade.js`**.

---

## Quick checklist

| Game  | What you configure |
|-------|---------------------|
| **Chess** | Nothing mandatory — **`https://ches.su`** is the default UIs (`EXPO_PUBLIC_VENDOR_CHESS_URL` optional override). |
| **Ludo** | Atlas cluster + DB user → Network Access **`0.0.0.0/0`** → **`CONNECTION_URI`** on **`dissertationgames-ludo`** in Render → wait for deploy success. |

---

## Split deploy (optional)

You can run the CRA frontend and Socket API on different URLs and set **`REACT_APP_SOCKET_URL`** at CRA build — see **`vendor/mern-ludo/src/App.js`** (`socketOrigin()`).
