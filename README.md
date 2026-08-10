<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/dbffb79d-6349-486c-9e60-5833e0bf1f65

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` and `VITE_FIREBASE_*` values in `.env.local` (see `.env.example`)
3. Run the app:
   `npm run dev`

## Privileged backend operations (staff deletion)

Permanently deleting a staff member has to remove their Firebase
**Authentication** account, not just their Firestore records — the client
SDK can't do that for anyone but itself. That one privileged operation runs
on a small Express server (`server/`) using the Firebase Admin SDK with a
service account key. It's the same Node service that serves the built app,
so it deploys to Railway (or any plain Node host) — **no Firebase Cloud
Functions and no Blaze billing plan required.**

### One-time setup

1. In Firebase Console → Project Settings → Service Accounts → **Generate
   new private key**. This downloads a JSON file. (Free on every plan,
   including Spark — this is just an API credential, not a billed product.)
2. Base64-encode it:
   ```bash
   base64 -i path/to/serviceAccountKey.json | tr -d '\n'
   ```
3. Set the result as the `FIREBASE_SERVICE_ACCOUNT_BASE64` environment
   variable on your host (e.g. Railway → your service → Variables). Keep
   the raw JSON file out of git — it's a full-trust credential.
4. Deploy `firestore.rules` and `firestore.indexes.json` with the project
   explicitly named — never rely on whatever project the Firebase CLI
   happens to have selected locally:
   ```bash
   FIREBASE_PROJECT_ID=your-real-project-id npm run deploy:firestore:rules
   FIREBASE_PROJECT_ID=your-real-project-id npm run deploy:firestore:indexes
   ```
   Both commands refuse to run at all if `FIREBASE_PROJECT_ID` is unset —
   this is deliberate: there is no `.firebaserc` in this repo and no
   default/fallback project baked in anywhere, specifically so a deploy
   can never silently target the wrong project. Find the correct project
   ID in Firebase Console → Project Settings → General → Project ID (it's
   also the value already set as `VITE_FIREBASE_PROJECT_ID` in this app's
   Railway environment). Requires being signed in locally via
   `npx firebase login` first. This also requires no billing plan.

### Local development

```bash
npm run dev            # Vite dev server on :3000
npm run dev:server      # Express API on :8080, in a second terminal
                         # (needs FIREBASE_SERVICE_ACCOUNT_BASE64 set locally too)
```
Vite proxies `/api/*` requests to the local Express server automatically.

### Production (Railway)

`npm run build` builds both the SPA (`dist/`) and the server bundle
(`server.js`); `npm start` runs `node server.js`, which serves the SPA and
exposes `POST /api/staff/delete`. Set `FIREBASE_SERVICE_ACCOUNT_BASE64` (and
your usual `VITE_FIREBASE_*` / `GEMINI_API_KEY` vars) in Railway's
environment variables and it just works — no Google Cloud billing account
needed anywhere in this flow.

### CORS / `ALLOWED_ORIGIN`

Since `server.js` serves both the SPA and `/api/*` from the same host,
requests are same-origin in the standard Railway setup above and
`ALLOWED_ORIGIN` doesn't need to be set. Only set it if the API is ever
split onto its own host, or another domain needs to call `/api/*` directly:
in Railway, add an `ALLOWED_ORIGIN` environment variable set to your app's
production URL (e.g. `https://your-app.up.railway.app`). If left unset, CORS
falls back to accepting any origin — safe for the default single-host
deployment, but worth setting explicitly the moment that assumption changes.
