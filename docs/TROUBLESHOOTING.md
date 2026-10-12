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
| **Styles not applying** | Tailwind/Hero UI config issue | Check `index.css`, `tailwind.config.*`, Hero UI provider setup. Ensure CSS imported. |

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
| **Connection refused (ERR_CONNECTION_REFUSED)** | Backend not running or wrong URL | Ensure backend is running on correct port. Check `VITE_SOCKET_URL`. |
| **connect_error / Unauthorized** | Token missing/invalid on socket auth | Ensure client sends token in `auth: { token }`. Verify token with Clerk on server (`io.use()`). Check Clerk keys. See [`SOCKETS.md`](./SOCKETS.md), [`AUTH.md`](./AUTH.md). |
| **Events not received** | Not joined to room or wrong event name | Check room join (`conversation:join`). Verify event names match exactly (case-sensitive). Use acknowledgements to debug. |
| **Messages sent twice** | Multiple event listeners attached | Remove listeners on cleanup (`socket.off()`/`useEffect` cleanup). Check useEffect deps. |
| **CORS with Socket.IO** | Socket.IO cors config missing | Configure `new Server(httpServer, { cors: { origin: FRONTEND_URL, credentials: true } })`. Match REST CORS. |
| **Rooms not working** | User not participant or wrong room name | Validate participant in DB before `socket.join()`. Use consistent room naming (e.g., `conversation:<id>`). |

---

## Authentication (Clerk) Issues

| Issue | Cause | Solution |
|---|---|---|
| **ClerkProvider missing** | Not wrapped at root | Wrap app in `<ClerkProvider publishableKey={...}>` in `main.tsx`/`App.tsx`. |
| **Invalid publishable key** | Wrong key or env not loaded | Check `VITE_CLERK_PUBLISHABLE_KEY`. Restart frontend after env change. |
| **401 on protected API calls** | Missing Bearer token | Use `getToken()` from Clerk and attach `Authorization: Bearer <token>`. |
| **Token verification fails on backend** | Wrong `CLERK_SECRET_KEY` or token format | Verify secret key. Ensure using `@clerk/backend` to verify. Check token is fresh. |
| **Redirect issues after login** | Wrong redirect URLs in Clerk | Add frontend URL to allowed redirect/origin in Clerk Dashboard. |
| **User not synced to DB** | Lazy sync not working or webhook failing | Check auth middleware for findOrCreate. Test `/api/auth/me`. For webhooks, see webhook section. |

---

## Media Upload (Multer + ImageKit) Issues

| Issue | Cause | Solution |
|---|---|---|
| **Multer: Unexpected field** | Wrong field name in form-data | Use field name `media` (matches `upload.single('media')`). Check client form. |
| **File too large** | Exceeds `limits.fileSize` | Increase limit if needed or compress client-side. Check Multer limits config. |
| **Unsupported file type** | MIME not in allowlist | Check file mimetype. Add to allowlist if legitimate. Or fix client. See [`MEDIA.md`](./MEDIA.md). |
| **req.file undefined** | Multer middleware not applied or wrong order | Apply `uploadSingle` middleware to route. Ensure using `multipart/form-data`. |
| **ImageKit upload fails (401/403)** | Wrong private/public key or invalid credentials | Verify `IMAGEKIT_PRIVATE_KEY`, `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_URL_ENDPOINT`. Check ImageKit dashboard. Never expose private key to frontend. |
| **ImageKit upload fails (network)** | Internet issue or ImageKit down | Check network. Retry. Log full error from ImageKit SDK. |
| **Buffer undefined with memoryStorage** | Using diskStorage config accidentally | Ensure `multer({ storage: multer.memoryStorage() })`. |
| **CORS on upload** | Upload route blocked | Same CORS applies. Ensure auth token sent. |

---

## Webhook Issues

| Issue | Cause | Solution |
|---|---|---|
| **Webhook returns 401 (signature verification failed)** | Wrong `CLERK_WEBHOOK_SECRET` or missing raw body | Verify signing secret matches Clerk. Ensure route gets raw body before `express.json()`. Use `express.raw({ type: 'application/json' })` for webhook route only. |
| **Webhook not receiving events (local)** | Local server not exposed | Use ngrok/localtunnel: `ngrok http 3000`. Update webhook URL in Clerk to public tunnel URL. |
| **Webhook returns 500** | Handler error (DB, validation) | Check backend logs. Add try-catch in webhook controller. Make handler idempotent. |
| **Duplicate user creation** | Idempotency not handled | Check if user exists by `clerkId` before creating. Use `findOneAndUpdate` with upsert carefully. |
| **Events missing** | Not subscribed in Clerk Dashboard | Go to Clerk Webhooks → Edit → Select events: `user.created`, `user.updated`, `user.deleted`. |

---

## Deployment Issues

| Issue | Cause | Solution |
|---|---|---|
| **Build fails (backend)** | TypeScript errors or missing deps | Run `yarn build` locally first. Fix errors. Ensure all deps in `dependencies` (not devDeps if needed at runtime). Check `tsconfig.json` outDir. |
| **Build fails (frontend)** | Vite/TS errors or missing VITE_* | `yarn build` locally. Add missing env vars in Netlify/Vercel. Check import paths. |
| **Backend returns 502/503** | App crashed on start or sleeping | Check platform logs (Render/Railway). Ensure `start` script runs `node dist/index.js` and build succeeded. Cold start on free tier is normal. |
| **Health endpoint 404** | Route not registered or wrong base URL | Hit `https://your-backend-url/health`. Ensure `app.get('/health', ...)` registered before other middleware? Should work. Check logs. |
| **CORS in production** | FRONTEND_URL wrong or trailing slash | Use exact frontend URL (e.g., `https://app.netlify.app` without `/`). Update backend env and redeploy. |
| **Socket.IO can't connect in prod** | Using `http://` or wrong URL | Use `https://` for backend URL (Render/Railway provide https). Set `VITE_SOCKET_URL=https://...`. |
| **MongoDB Atlas connection times out** | Network Access not allowing | Add `0.0.0.0/0` to Atlas Network Access (for free tier learning) or platform IPs. Redeploy backend. |
| **Clerk auth fails in prod** | Using dev keys or wrong origins | Use production Clerk keys. Add prod frontend URL to Clerk allowed origins. |
| **Images not loading (ImageKit)** | URL endpoint or CORS | Check `IMAGEKIT_URL_ENDPOINT`. ImageKit serves via https. Ensure URLs are correct. |

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

---

*Last updated: Initial troubleshooting guide covering common local/dev/deploy issues. Will expand as real issues are encountered.*