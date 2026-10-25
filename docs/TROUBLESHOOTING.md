# Troubleshooting

This document covers common issues you might encounter while developing **rtcamern** locally or during deployment. Each issue includes causes, solutions, and related docs.

---

## Table of Contents

- [Local Development Issues](#local-development-issues)
- [Backend Issues](#backend-issues)
- [Frontend Issues](#frontend-issues)
- [Database Issues](#database-issues)
- [Socket.IO Issues](#socketio-issues)
- [Authentication (Clerk) Issues](#authentication-clerk-issues)
- [Media Upload (Multer + ImageKit) Issues](#media-upload-multer--imagekit-issues)
- [Webhook Issues](#webhook-issues)
- [Deployment Issues](#deployment-issues)
- [General Tips](#general-tips)

---

## Local Development Issues

| Issue | Cause | Solution |
|---|---|---|
| **Port already in use (3000/5173)** | Another process running on same port | Kill process: `lsof -ti:3000 \| xargs kill -9` (mac/linux) or change PORT in backend `.env`. Vite uses next available port if 5173 busy. |
| **Yarn Berry (PnP) errors** | Cache/state mismatch | Run `yarn install --immutable`. Check `.yarnrc.yml`. Don't mix `npm` and `yarn`. |
| **Node version mismatch** | Using old Node version | Use Node LTS (v20+). Check `node -v`. Use `nvm` to switch versions. |
| **Cannot find module** | Dependencies not installed or path issue | Run `yarn install` in respective folder (backend/frontend). Check import paths (TypeScript). |

---

## Backend Issues

| Issue | Cause | Solution |
|---|---|---|
| **Server won't start** | Missing `.env` or invalid values | Copy `.env.example` to `.env`. Check required vars (PORT, MONGO_URI). See [`ENV.md`](./ENV.md). |
| **TypeScript compilation errors** | Type mismatches, missing types | Read error carefully. Install missing `@types/*` if needed. Check `tsconfig.json`. Use `tsx` for dev (transpiles on-the-fly). |
| **`dotenv` not loading** | `.env` in wrong location | Backend `.env` must be in `backend/` root. Import `dotenv/config` at top of `index.ts`. |
| **CORS blocked requests** | Missing/incorrect CORS config | Configure `cors()` with `origin: FRONTEND_URL` (or array). See [`MIDDLEWARE.md`](./MIDDLEWARE.md). |

---

## Frontend Issues

| Issue | Cause | Solution |
|---|---|---|
| **Vite dev server won't start** | Port conflict or config issue | Try `yarn dev --port 5174`. Check `vite.config.ts`. |
| **Blank page after start** | Build/runtime error | Open browser console for errors. Check for missing imports, invalid JSX/TS. |
| **HMR not working** | File watcher issues (WSL, network) | Restart dev server. Check Vite config for server options. |
| **Environment variables undefined** | Missing `VITE_` prefix | Vite only exposes vars prefixed `VITE_*`. Rename in `.env`. Restart dev server after changes. See [`ENV.md`](./ENV.md). |
| **Styles not applying** | Missing CSS import | The app uses plain CSS (`index.css`, `App.css`). Tailwind/Hero UI are not installed yet — don't look for `tailwind.config.*`. |

---

## Database Issues

| Issue | Cause | Solution |
|---|---|---|
| **MongoDB connection failed (ECONNREFUSED)** | Local MongoDB not running | Start MongoDB: `mongod` or use MongoDB Compass. Or switch to Atlas URI. |
| **Authentication failed (Atlas)** | Wrong username/password in URI | Recreate DB user or check URI. Special chars in password must be URL-encoded. |
| **IP not whitelisted (Atlas)** | Current IP not in Network Access | Add your IP or `0.0.0.0/0` for dev (less secure, only for learning). |
| **Mongoose model not registered** | Imported after use or circular import | Import models before routes that use them. Check file order. |
| **Validation errors** | Schema constraints violated | Check Mongoose schema vs data. Use try-catch and log errors. See [`DATABASE.md`](./DATABASE.md). |

---

## Socket.IO Issues

| Issue | Cause | Solution |
|---|---|---|
| **Connection refused (ERR_CONNECTION_REFUSED)** | Backend not running or wrong port | Ensure the backend is running on the expected port. In the monolith the client connects to the same origin; locally that is `http://localhost:3000`. |
| **Messages not arriving in real time** | Only one socket per user, or the receiver is offline | `userSocketMap` is `Record<userId, socketId>`, so a second tab overwrites the first. The emit only happens when the receiver has a socket. Tracked in [`BUGS.md`](../BUGS.md). |
| **Anyone can subscribe to another user's messages** | Socket handshake trusts `?userId=` | Not fixed yet — the highest-priority item in [`BUGS.md`](../BUGS.md). |
| **Events not received** | Wrong event name | Current events are `getOnlineUsers` and `newMessage` (case-sensitive). Rooms are not implemented. |
| **Messages sent twice** | Multiple event listeners attached | Remove listeners on cleanup (`socket.off()`/`useEffect` cleanup). Check useEffect deps. |
| **CORS with Socket.IO** | Server CORS origin mismatch | The server allows `FRONTEND_URL` only. In the monolith, requests are same-origin. |
| **Rooms not working** | Rooms are not implemented | `conversation:join/leave` is target design, not code. See [`SOCKETS.md`](./SOCKETS.md). |

---

## Authentication (Clerk) Issues

| Issue | Cause | Solution |
|---|---|---|
| **ClerkProvider missing** | Not wrapped at root | `frontend/src/main.tsx` wraps the app in `<ClerkProvider>`; the publishable key comes from `VITE_CLERK_PUBLISHABLE_KEY`. |
| **Invalid publishable key** | Wrong key or env not loaded | Check `VITE_CLERK_PUBLISHABLE_KEY`. Restart frontend after env change. |
| **401 on protected API calls** | No Clerk session | `authMiddleware` calls `getAuth(req)`, which reads the Clerk session cookie or a Bearer token. Send the request with credentials (`credentials: "include"` if cross-origin). |
| **Token verification fails on backend** | Wrong `CLERK_SECRET_KEY` | Verify the secret key is set for the running process. Verification is done by `clerkMiddleware()` + `getAuth(req)` from `@clerk/express` — not `jsonwebtoken`. |
| **Redirect issues after login** | Wrong redirect URLs in Clerk | Add the app URL to allowed redirect/origin in Clerk Dashboard. |
| **User not synced to DB** | Webhook missing or failing | There is **no lazy sync**: the user is only created by the Clerk webhook (`/api/webhooks/clerk`). Check the webhook delivery in Clerk; `POST /api/auth/me` returns `404` until the user exists. See [`AUTH.md`](./AUTH.md). |

---

## Media Upload (Multer + ImageKit) Issues

| Issue | Cause | Solution |
|---|---|---|
| **Multer: Unexpected field** | Wrong field name in form-data | Use field name `media` (matches `upload.single('media')`). Check client form. |
| **File too large** | Exceeds `limits.fileSize` | Increase limit if needed or compress client-side. Check Multer limits config. |
| **Unsupported file type** | MIME not in allowlist | Check file mimetype. Add to allowlist if legitimate. Or fix client. See [`MEDIA.md`](./MEDIA.md). |
| **req.file undefined** | Multer middleware not applied or wrong order | Apply `upload.single('media')` to the route. Ensure using `multipart/form-data`. |
| **ImageKit upload fails (401/403)** | Wrong private key or invalid credentials | Verify `IMAGEKIT_PRIVATE_KEY`; also check `IMAGEKIT_URL_ENDPOINT` and `IMAGEKIT_ID`. Check ImageKit dashboard. Never expose the private key to frontend. |
| **ImageKit upload fails (network)** | Internet issue or ImageKit down | Check network. Retry. Log full error from ImageKit SDK. |
| **Buffer undefined with memoryStorage** | Using diskStorage config accidentally | Ensure `multer({ storage: multer.memoryStorage() })`. |
| **CORS on upload** | Upload route blocked | Same CORS applies. Ensure auth token sent. |

---

## Webhook Issues

| Issue | Cause | Solution |
|---|---|---|
| **Webhook returns 400 (signature verification failed)** | Wrong `CLERK_WEBHOOK_SIGNING_SECRET` or missing raw body | Verify the signing secret matches Clerk. The route is registered with `express.raw({ type: "application/json" })` **before** `express.json()`; don't move it. |
| **Webhook returns 503** | `CLERK_WEBHOOK_SIGNING_SECRET` is unset | Set the variable and redeploy. |
| **Webhook not receiving events (local)** | Local server not exposed | Use ngrok/localtunnel: `ngrok http 3000`. Update the webhook URL in Clerk to the public tunnel URL. |
| **Webhook returns 500** | Handler error (DB, validation) | Check backend logs. The handler upserts/deletes by `clerkId`; failures are logged and returned as 500. |
| **Duplicate user creation** | Idempotency issue | The handler upserts by `clerkId`; `clerkId` and `email` are unique in the schema, so duplicates should fail rather than multiply. |
| **Events missing** | Not subscribed in Clerk Dashboard | Go to Clerk Webhooks → Edit → Select events: `user.created`, `user.updated`, `user.deleted`. |

---

## Deployment Issues

| Issue | Cause | Solution |
|---|---|---|
| **Build fails (backend)** | TypeScript errors or missing deps | Run `yarn build` locally first. Fix errors. Ensure runtime deps are in `dependencies` (the Docker runner installs production deps only). Check `tsconfig.json` outDir. |
| **Build fails (frontend / Docker)** | Vite/TS errors or missing build arg | Run `yarn build` in `frontend/`. Ensure `VITE_CLERK_PUBLISHABLE_KEY` is passed as a Docker build arg (Vite inlines it at build time). |
| **Backend returns 502/503** | App crashed on start or sleeping | Check Render logs. Missing `MONGO_URI` (production) or any ImageKit var crashes the process at import time. Cold start on free tier is normal. |
| **Health endpoint 404** | Wrong base URL or route shadowed | Hit `https://your-app-url/health`. It is registered before the SPA catch-all and returns `{ ok: true }`. |
| **CORS in production** | `FRONTEND_URL` wrong or trailing slash | In the monolith this should be the app's own URL. Use it without a trailing slash. |
| **Socket.IO can't connect in prod** | Wrong origin or backend not running | Use `https://` and the same origin as the app (monolith). Check logs; Socket.IO shares the HTTP server. |
| **MongoDB Atlas connection times out** | Network Access not allowing | Add `0.0.0.0/0` to Atlas Network Access (for free tier learning) or the platform's IPs. |
| **Clerk auth fails in prod** | Using dev keys or wrong origins | Use production Clerk keys. Add the deployed URL to Clerk allowed origins. |
| **Images not loading (ImageKit)** | Wrong URL endpoint | Check `IMAGEKIT_URL_ENDPOINT`; stored messages hold absolute ImageKit URLs. |

---

## General Tips

- **Read logs first:** Backend/frontend console logs, browser dev tools (Network, Console), deployment platform logs.
- **Test incrementally:** Build one feature at a time. Test locally before deploying.
- **Keep env in sync:** Update `.env.example` whenever adding new env vars.
- **Use TypeScript errors:** They guide you. Don't ignore them.
- **Check middleware order:** Webhooks need raw body before `express.json()`. Auth before protected routes. Error middleware last.
- **Ask before assuming:** If something is unclear, refer to the relevant doc file or ask for clarification (per AGENTS.md).
- **Document as you go:** When you fix an issue, consider adding it to this file or inline comments.

---

## Related Documentation

- [`SETUP.md`](./SETUP.md) – Local setup steps
- [`ENV.md`](./ENV.md) – Env var reference
- [`MIDDLEWARE.md`](./MIDDLEWARE.md) – Middleware order & CORS
- [`AUTH.md`](./AUTH.md) – Clerk auth troubleshooting
- [`SOCKETS.md`](./SOCKETS.md) – Socket.IO debug
- [`MEDIA.md`](./MEDIA.md) – Upload issues
- [`WEBHOOKS_CRON.md`](./WEBHOOKS_CRON.md) – Webhook/cron issues
- [`DEPLOYMENT.md`](./DEPLOYMENT.md) – Deployment-specific issues
- [`DATABASE.md`](./DATABASE.md) – DB schema/issues
- [`../BUGS.md`](../BUGS.md) – Known bugs and deferred fixes

---

*Last updated: reflects the current backend (Clerk session auth, messages, uploads, webhooks, partial Socket.IO) and the single-container deployment.*