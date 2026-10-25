# Deployment Guide

This guide covers deploying **rtcamern** for free to get a live URL. It covers backend, frontend, database, environment variables, and troubleshooting.

All tools recommended are **free tier friendly**, matching the project's goal.

---

## Overview

The shipped deployment is a **single container**: one Render web service running the repo's `Dockerfile`, which builds the Vite frontend into `/app/public` and the Express API into `/app/dist`. Express serves both, so there is no separate frontend host and no cross-origin CORS.

1. **Database** – [MongoDB Atlas](https://www.mongodb.com/atlas) (free M0 cluster)
2. **App** – [Render](https://render.com/) (Docker web service; Socket.IO shares the same HTTP server)
3. **Frontend** – built into the image and served by Express

Clerk and ImageKit are already cloud-based (we just use their keys).

> Splitting frontend (Netlify/Vercel) and backend (Render/Railway) is possible and described at the end, but the frontend has no API/socket client yet, so the monolith is the only wired path.


---

## 1. Prerequisites

- Git repo with all code committed and pushed (GitHub/GitLab/Bitbucket)
- [MongoDB Atlas](https://www.mongodb.com/atlas) account (free)
- [Render](https://render.com/) account (free)
- [Clerk](https://clerk.com/) app configured (production keys)
- [ImageKit](https://imagekit.io/) account configured

---

## 2. Database: MongoDB Atlas

### Setup Steps

1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas) and create a free account
2. Create a new project (e.g., `rtcamern`)
3. Build a database → Choose **FREE (M0)** cluster
4. Select cloud provider/region (closest to deployment region)
5. Create cluster (may take a few minutes)
6. **Database Access**: Create a database user (username/password). Save these securely.
7. **Network Access**: Add IP addresses
   - For Render/Railway, you can often use `0.0.0.0/0` (allow from anywhere) for free tiers, or add their specific IPs if available.
   - For local dev, add your current IP.
8. **Connect**: Get connection string (SRV) – looks like `mongodb+srv://<username>:<password>@cluster0...mongodb.net/rtcamern?retryWrites=true&w=majority`
9. Replace `<username>`, `<password>`, and database name as needed.

**Security note:** Never commit the connection string. Use env vars in deployment.

---

## 3. Deploy the App (Render + Docker)

1. Push the repo to GitHub
2. Sign in to [render.com](https://render.com/) and connect GitHub
3. New → **Web Service** → select the repo
4. Configure:
   - **Name:** `rtcamern`
   - **Root Directory:** repo root (the `Dockerfile` needs both `backend/` and `frontend/`)
   - **Runtime:** **Docker**
   - **Dockerfile Path:** `./Dockerfile`
   - **Build Arg:** `VITE_CLERK_PUBLISHABLE_KEY` (Vite inlines it at build time — set it in the Render UI, not at runtime)
5. Add **Environment Variables** (from [`ENV.md`](./ENV.md)):
   - `NODE_ENV=production` (already set in the image; harmless to repeat)
   - `MONGO_URI` – Atlas SRV string (**required** in production)
   - `DB_NAME=rtcamern`
   - `CLERK_SECRET_KEY`
   - `CLERK_WEBHOOK_SIGNING_SECRET` – optional; the webhook returns `503` without it
   - `IMAGEKIT_PRIVATE_KEY`, `IMAGEKIT_URL_ENDPOINT`, `IMAGEKIT_ID` – **all required**; the container exits without them
   - `FRONTEND_URL` – the service's own public URL (used for CORS and the keep-alive cron)
6. Create the service. The image sets `PORT=3001`; Render injects its own `PORT`, and the app honours it.
7. Get the public URL (e.g., `https://rtcamern.onrender.com`) and set `FRONTEND_URL` to it.
8. Add the Clerk webhook endpoint pointing at that URL (see below).

**Free tier notes:**
- Service sleeps after inactivity (cold start on first request). The `cron` job pings `FRONTEND_URL/health` every 14 minutes in production to reduce this.
- 512 MB RAM, shared CPU — fine for learning/demo.

---

## 4. Alternative: Split Hosting (not wired yet)

You can run the API on Render/Railway and the SPA on Netlify/Vercel instead of the monolith. This requires frontend changes that do not exist yet:

- An API client using `VITE_API_URL` (absolute backend URL)
- A Socket.IO client using `VITE_SOCKET_URL`
- `FRONTEND_URL` on the backend set to the frontend origin for CORS
- Deep-link rewrites on the static host (Netlify `_redirects`: `/* /index.html 200`; Vercel handles it)

Until those land, deploying the monolith (section 3) is the supported path.


---

## 5. Environment Configuration After Deployment

### Clerk Setup

1. Go to [Clerk Dashboard](https://dashboard.clerk.com/) → Your App
2. **Allowed origins (CORS):**
   - Add the deployed app URL: `https://rtcamern.onrender.com` (monolith)
   - Add local: `http://localhost:5173`
3. **Webhooks:**
   - Add endpoint: `https://your-app-url/api/webhooks/clerk`
   - Select events: `user.created`, `user.updated`, `user.deleted`
   - Copy **Signing Secret** → set as `CLERK_WEBHOOK_SIGNING_SECRET` in the service env
4. Use **production** API keys in deployment (not dev/test keys)

### CORS Configuration (Backend)

The backend calls `cors({ origin: FRONTEND_URL, credentials: true })`. With the monolith, `FRONTEND_URL` is the app's own URL, so browser requests are same-origin and CORS is mostly a no-op; it matters only if you split hosting.

The Socket.IO server uses the same `FRONTEND_URL` for its own CORS config:

```ts
const io = new Server(server, { cors: { origin: [FRONTEND_URL] } });
```

See [`MIDDLEWARE.md`](./MIDDLEWARE.md) for middleware details.

### Socket.IO Client URL (planned)

The frontend has no socket client yet. When it is added, it should connect to the same origin in the monolith:

```ts
const socket = io({ query: { userId } }); // current handshake — unauthenticated
```

The target design authenticates with a Clerk token. See [`SOCKETS.md`](./SOCKETS.md) and [`BUGS.md`](../BUGS.md) before wiring it up.

---

## 6. Build Scripts

Build scripts are in place.

**Backend** (`backend/package.json`):
```json
"scripts": {
  "dev": "tsx watch ./src/index.ts",
  "build": "tsc",
  "start": "node dist/index.js"
}
```
`backend/tsconfig.json` outputs to `dist/` (`rootDir: "./src"`, `outDir: "./dist"`). Run `yarn build && yarn start` to verify the API locally.

> **Note:** static SPA serving resolves `publicDir` to `../public` next to `dist/`. That directory only exists in the Docker image (the frontend build is copied to `/app/public`). Locally `backend/public` does not exist, so `yarn start` serves the API only — run the Vite dev server (`frontend/`) separately for the frontend.

**Frontend:** Vite's `build` script (`tsc -b && vite build`) outputs to `dist/`.

### Single-Container (Monolith) Build

The repo root `Dockerfile` builds the frontend, compiles the backend, and serves both from one Express process (`/app/dist` for the API, `/app/public` for the static frontend). MongoDB is external (Atlas); no database runs in the image.

```bash
# Build (VITE_* are inlined at build time)
docker build --build-arg VITE_CLERK_PUBLISHABLE_KEY=pk_live_xxx -t rtcamern:latest .

# Run (NODE_ENV=production is set in the image, so MONGO_URI is required)
docker run --rm -p 3001:3001 \
  -e MONGO_URI="mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority" \
  -e DB_NAME=rtcamern \
  -e CLERK_SECRET_KEY=sk_live_xxx \
  -e IMAGEKIT_PRIVATE_KEY=private_xxx \
  -e IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_id/ \
  -e IMAGEKIT_ID=your_id \
  -e FRONTEND_URL=http://localhost:3001 \
  rtcamern:latest
```

The image sets `PORT=3001` and has no `EXPOSE` instruction — publish the port with `-p` as shown.

See the [README](../README.md#docker-single-container) for details.

---

## 7. Deployment Checklist

### Pre-Deploy
- [ ] All `.env` values documented in `.env.example`
- [ ] `.gitignore` includes `.env`, `node_modules`, `dist`
- [ ] Backend has `build` and `start` scripts
- [ ] Frontend builds successfully locally (`yarn build`)
- [ ] Backend builds successfully locally (`yarn build`)
- [ ] `FRONTEND_URL` matches the deployed app URL (no trailing slash)
- [ ] Webhook endpoint configured in Clerk

### Deploy Database
- [ ] MongoDB Atlas cluster created
- [ ] DB user created with strong password
- [ ] Network Access allows Render (`0.0.0.0/0` or specific IPs)
- [ ] Connection string copied to the service env as `MONGO_URI`

### Deploy App
- [ ] Pushed to Git
- [ ] Render web service created from the repo-root `Dockerfile`
- [ ] `VITE_CLERK_PUBLISHABLE_KEY` set as a build arg
- [ ] All runtime env vars set (Mongo, Clerk, ImageKit)
- [ ] Image builds and the container starts
- [ ] Health endpoint accessible: `https://app-url/health` returns `{"ok":true}`
- [ ] App loads at the service URL (SPA served by Express)

### Post-Deploy
- [ ] Auth works (Clerk sign-in)
- [ ] Clerk user appears in MongoDB after sign-up (webhook)
- [ ] `GET /api/messages/users` returns data with a valid session
- [ ] Test sending text and media via `POST /api/messages/send/:id`
- [ ] Test `newMessage` delivery between two sockets (remember: handshake is unauthenticated — see [BUGS.md](../BUGS.md))
- [ ] Verify webhooks in the Clerk dashboard
- [ ] Update README with the live demo URL

---

## 8. Troubleshooting Common Deployment Issues

| Issue | Cause | Solution |
|---|---|---|
| **CORS errors** | FRONTEND_URL mismatch or not whitelisted | Ensure backend CORS includes exact frontend URL (no trailing slash). Check env var. |
| **Socket.IO fails to connect** | Backend not running or client points at the wrong origin | In the monolith, connect with `io()` (same origin). Check backend logs; Socket.IO is attached to the same HTTP server. |
| **MongoDB connection fails** | IP not allowed or wrong password/URI | Check Network Access in Atlas. URL-encode special chars in password. Verify MONGO_URI. |
| **502/503 on backend** | App crashed or sleeping (Render free tier) | Check Render logs. Ensure the container starts (`node dist/index.js`). Missing ImageKit vars crash the process at import time. Cold start on free tier is normal. |
| **Frontend build fails in Docker** | Type errors or missing build arg | Run `yarn build` in `frontend/` locally. Ensure `VITE_CLERK_PUBLISHABLE_KEY` is passed as a build arg. |
| **Clerk webhook fails** | Wrong secret or raw body issue | Verify `CLERK_WEBHOOK_SIGNING_SECRET`. Ensure the route receives the raw body before `express.json()` (it is registered first). Check the URL in Clerk. |
| **404 on routes (SPA)** | Static build missing or path outside the SPA fallback | The catch-all is registered only when `public` exists (Docker image). `/api/*` intentionally returns JSON 404. |

---

## 9. Useful Commands for Debugging

**Check logs:**
- Render: Dashboard → Web Service → Logs

**Test the health endpoint:**
```bash
curl https://your-app-url/health
```

**Check the static build is being served:**

The SPA fallback only registers when `publicDir` (`../public` relative to `dist/`) exists — that is true in the Docker image, not in a local `yarn start`.

---

## Related Documentation

- [`ENV.md`](./ENV.md) – All environment variables
- [`SETUP.md`](./SETUP.md) – Local setup
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) – System overview
- [`AUTH.md`](./AUTH.md) – Clerk config
- [`SOCKETS.md`](./SOCKETS.md) – Socket.IO config
- [`MEDIA.md`](./MEDIA.md) – ImageKit config
- [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md) – More issues
- [`../BUGS.md`](../BUGS.md) – Known Socket.IO issues

---

*Last updated: reflects the single-container Docker deployment on Render (frontend served by Express); split hosting is documented as an unwired alternative.*