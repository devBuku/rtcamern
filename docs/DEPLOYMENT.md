# Deployment Guide

This guide covers deploying **rtcamern** for free to get a live URL. It covers backend, frontend, database, environment variables, and troubleshooting.

All tools recommended are **free tier friendly**, matching the project's goal.

---

## Overview

Deployment consists of three parts:

1. **Database** – [MongoDB Atlas](https://www.mongodb.com/atlas) (free M0 cluster)
2. **Backend** – [Render](https://render.com/) or [Railway](https://railway.app/) (Node.js/Express + Socket.IO)
3. **Frontend** – [Netlify](https://www.netlify.com/) or [Vercel](https://vercel.com/) (React + Vite)

Clerk and ImageKit are already cloud-based (we just use their keys).

---

## 1. Prerequisites

- Git repo with all code committed and pushed (GitHub/GitLab/Bitbucket)
- [MongoDB Atlas](https://www.mongodb.com/atlas) account (free)
- [Render](https://render.com/) or [Railway](https://railway.app/) account (free)
- [Netlify](https://www.netlify.com/) or [Vercel](https://vercel.com/) account (free)
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

## 3. Backend Deployment

You can choose either Render or Railway. Both support Node.js apps and free tiers.

### Option A: Render

[Render](https://render.com/) free tier is suitable for learning projects (web service).

#### Steps

1. Push backend code to GitHub
2. Sign in to [render.com](https://render.com/) and connect GitHub
3. New → Web Service → Select your repo
4. Configure:
   - **Name:** `rtcamern-backend`
   - **Root Directory:** `backend` (if monorepo)
   - **Runtime:** Node
   - **Build Command:** `yarn install && yarn build`
   - **Start Command:** `yarn start`

5. Add **Environment Variables** (from [`ENV.md`](./ENV.md)):
   - `PORT` (Render may set automatically; can use `process.env.PORT`)
   - `MONGO_URI` – Atlas SRV string
   - `CLERK_SECRET_KEY`
   - `CLERK_WEBHOOK_SECRET`
   - `CLIENT_URL` – Frontend URL (Netlify/Vercel)
   - `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_PRIVATE_KEY`, `IMAGEKIT_URL_ENDPOINT`
   - `NODE_ENV=production`
   - `FRONTEND_URL` – Your deployed frontend URL (e.g., Netlify/Vercel)

6. Create Web Service. Render will build and deploy.
7. Get the public URL (e.g., `https://rtcamern-backend.onrender.com`)

**Free tier notes:**
- Service may sleep after inactivity (cold start on first request)
- 512 MB RAM, shared CPU
- Suitable for learning/demo

### Option B: Railway

[Railway](https://railway.app/) is also free and easy.

#### Steps

1. Sign in to [railway.app](https://railway.app/) → New Project → Deploy from GitHub repo
2. Select repo, configure `backend` as root directory
3. Add environment variables same as above
4. Railway auto-detects Node.js; set start command if needed (`yarn start` after build)
5. Get public URL from deployment

---

## 4. Frontend Deployment

### Option A: Netlify

1. Push frontend to GitHub
2. Go to [netlify.com](https://www.netlify.com/) → Add new site → Import from Git
3. Select repo, configure:
   - **Base directory:** `frontend`
   - **Build command:** `yarn build` (Vite builds to `dist/`)
   - **Publish directory:** `frontend/dist`
4. Add **Environment Variables** (VITE_* prefix):
   - `VITE_CLERK_PUBLISHABLE_KEY`
   - `VITE_API_URL` – Backend public URL (Render/Railway)
   - `VITE_SOCKET_URL` – Same as API URL (or backend URL) since Socket.IO runs on same server
   - `VITE_IMAGEKIT_URL_ENDPOINT` (optional)
5. Deploy site
6. Get URL (e.g., `https://rtcamern.netlify.app`)
7. (Optional) Set custom domain

### Option B: Vercel

1. Go to [vercel.com](https://vercel.com/) → New Project → Import Git repo
2. Configure project:
   - **Framework:** Vite (auto-detected)
   - **Root Directory:** `frontend`
   - **Build Command:** `yarn build`
   - **Output Directory:** `dist`
3. Add VITE_* env vars same as Netlify
4. Deploy
5. Get URL

---

## 5. Environment Configuration After Deployment

### Clerk Setup

1. Go to [Clerk Dashboard](https://dashboard.clerk.com/) → Your App
2. **Allowed origins (CORS):**
   - Add frontend URL: `https://rtcamern.netlify.app` (or Vercel)
   - Add local: `http://localhost:5173`
3. **Webhooks (if implemented):**
   - Add endpoint: `https://your-backend-url/api/webhooks/clerk`
   - Select events: `user.created`, `user.updated`, `user.deleted`
   - Copy **Signing Secret** → set as `CLERK_WEBHOOK_SECRET` in backend env
4. Use **production** API keys in deployment (not dev/test keys)

### CORS Configuration (Backend)

In backend, configure CORS to allow frontend origin only:

```ts
import cors from "cors";
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
```

This is critical for REST + Socket.IO to work cross-origin. You can also set an array if multiple origins are needed.

See [`MIDDLEWARE.md`](./MIDDLEWARE.md) for middleware details.

### Socket.IO Client URL

Frontend must connect to backend WebSocket:

```ts
const socket = io(import.meta.env.VITE_SOCKET_URL, {
  auth: { token: await getToken() }
});
```

Set `VITE_SOCKET_URL` to backend public URL.

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
  -e CLERK_PUBLISHABLE_KEY=pk_live_xxx \
  -e CLERK_SECRET_KEY=sk_live_xxx \
  -e FRONTEND_URL=http://localhost:3001 \
  rtcamern:latest
```

See the [README](../README.md#docker-single-container) for details.

---

## 7. Deployment Checklist

### Pre-Deploy
- [ ] All `.env` values documented in `.env.example`
- [ ] `.gitignore` includes `.env`, `node_modules`, `dist`
- [ ] Backend has `build` and `start` scripts
- [ ] Frontend builds successfully locally (`yarn build`)
- [ ] Backend builds successfully locally (`yarn build` then `yarn start`)
- [ ] CORS configured with correct CLIENT_URL
- [ ] Socket.IO URL points to backend
- [ ] Webhook endpoint configured in Clerk (if ready)

### Deploy Database
- [ ] MongoDB Atlas cluster created
- [ ] DB user created with strong password
- [ ] Network Access allows deployment platform (0.0.0.0/0 or specific)
- [ ] Connection string copied to backend env

### Deploy Backend
- [ ] Pushed to Git
- [ ] Web service created (Render/Railway) with root `backend`
- [ ] All env vars set
- [ ] Build succeeds
- [ ] Health endpoint accessible: `https://backend-url/health` returns `{"ok":true}`

### Deploy Frontend
- [ ] Site created (Netlify/Vercel) with root `frontend`
- [ ] VITE_* env vars set
- [ ] Build succeeds
- [ ] App loads at frontend URL
- [ ] Can connect to backend (check network/socket)
- [ ] Auth works (Clerk login)

### Post-Deploy
- [ ] Test real-time messaging between multiple tabs/devices
- [ ] Test file upload (if implemented)
- [ ] Test auth flow end-to-end
- [ ] Update README with live demo URL (placeholder until done)
- [ ] Verify webhooks working in Clerk dashboard (if enabled)

---

## 8. Troubleshooting Common Deployment Issues

| Issue | Cause | Solution |
|---|---|---|
| **CORS errors** | CLIENT_URL mismatch or not whitelisted | Ensure backend CORS includes exact frontend URL (no trailing slash). Check env var. |
| **Socket.IO fails to connect** | Wrong `VITE_SOCKET_URL` or backend not running | Use backend URL. Check backend logs. Ensure Socket.IO attached to HTTP server. |
| **MongoDB connection fails** | IP not allowed or wrong password/URI | Check Network Access in Atlas. URL-encode special chars in password. Verify MONGO_URI. |
| **502/503 on backend** | App crashed or sleeping (Render free tier) | Check Render/Railway logs. Ensure `start` script works. Fix errors, redeploy. Cold start is normal on free tier. |
| **Frontend build fails** | Type errors or missing env | Run `yarn build` locally to see errors. Fix TS issues. Ensure all required VITE_* vars set. |
| **Clerk webhook fails** | Wrong secret or raw body issue | Verify `CLERK_WEBHOOK_SECRET`. Ensure route receives raw body before JSON parse. Check tunnel URL in Clerk. |
| **404 on routes (SPA)** | Frontend routing fallback missing | For Vite/React Router, configure redirects. Netlify: add `_redirects` with `/* /index.html 200`. Vercel: handled automatically. |

---

## 9. Useful Commands for Debugging

**Check backend logs:**
- Render: Dashboard → Web Service → Logs
- Railway: Project → Service → Logs

**Test backend health:**
```bash
curl https://your-backend-url/health
```

**Test from browser console (frontend):**
```js
// Check env
console.log(import.meta.env.VITE_API_URL, import.meta.env.VITE_SOCKET_URL);
```

---

## Related Documentation

- [`ENV.md`](./ENV.md) – All environment variables
- [`SETUP.md`](./SETUP.md) – Local setup
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) – System overview
- [`AUTH.md`](./AUTH.md) – Clerk config
- [`SOCKETS.md`](./SOCKETS.md) – Socket.IO config
- [`MEDIA.md`](./MEDIA.md) – ImageKit config
- [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md) – More issues

---

*Last updated: Initial deployment guide with free tier options. Will be updated with exact commands/scripts once build setup is finalized.*