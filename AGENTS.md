# AGENTS.md

High-signal guidance for working in the `rtcamern` repo. Preserve only what helps avoid mistakes.

---

## Project Shape

- **Type:** Monolith (backend serves frontend in production). Two independent packages — **not** a Yarn workspace.
- **Stacks:** Backend TypeScript (Express 5 + Mongoose + Socket.IO + Clerk), Frontend TypeScript (React + Vite + Hero UI + Clerk).
- **Deployment:** Single Docker image; backend copies built frontend to `/app/public` and serves it with `express.static`. MongoDB is external (MongoDB Atlas). Render is used (Dockerfile has no `EXPOSE`/`HEALTHCHECK`).

---

## Entrypoints & Key Paths

- **Backend entry:** `backend/src/index.ts` — sets CORS (uses `FRONTEND_URL`), `clerkMiddleware`, serves `/health`, in prod serves SPA from `publicDir = ../public` (resolves relative to `dist/index.js`), falls through API paths to 404, connects DB, starts server, starts cron in production.
- **Backend build:** `backend/tsconfig.json` -> `./dist`. `yarn build` runs `tsc`, `yarn start` runs `node dist/index.js`.
- **Frontend entry:** `frontend/src/main.tsx` wrapped with `ClerkProvider`, `frontend/src/App.tsx` uses Clerk components.
- **Frontend build:** `frontend/vite.config.ts` (Vite + React Compiler via Babel). `yarn build` does `tsc -b && vite build`, outputs to `frontend/dist`.
- **Constants:** `backend/src/constants/env.ts` (NODE_ENV validation, MONGO_URI selection, `FRONTEND_URL`), `backend/src/constants/http-status.ts` (use these for status codes).
- **DB:** `backend/src/lib/db.ts` uses `mongoose.connect(MONGO_URI, { dbName: DB_NAME })` (DB name separate from URI).
- **Cron:** `backend/src/lib/cron.ts` pings `FRONTEND_URL/health` every 14 min (`*/14 * * * *`) in production via `NODE_ENV` check (started in `index.ts`). Uses the `cron` package (not `node-cron`).
- **Models:** `backend/src/models/user.model.ts`, `backend/src/models/message.model.ts` (TS interfaces + schemas).

---

## Quick Reference

| Topic | Document |
|---|---|
| Commands (dev, build, lint, Docker) | [`docs/AGENT-COMMANDS.md`](./docs/AGENT-COMMANDS.md) |
| TypeScript & compiler quirks | [`docs/AGENT-TYPESCRIPT.md`](./docs/AGENT-TYPESCRIPT.md) |
| Gotchas & constraints | [`docs/AGENT-GOTCHAS.md`](./docs/AGENT-GOTCHAS.md) |
| Conventions & agent behavior | [`docs/AGENT-CONVENTIONS.md`](./docs/AGENT-CONVENTIONS.md) |
| Environment variables | [`docs/ENV.md`](./docs/ENV.md) |
| Local setup | [`docs/SETUP.md`](./docs/SETUP.md) |
| Architecture & data flow | [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) |
| Deployment | [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) |

---

## Package Manager

Both packages use Yarn 4 (Berry) with `nodeLinker: node-modules` and `packageManager` pinned. Install with `yarn install --immutable` (Docker does this). Each package has its own `yarn.lock` and `node_modules` — there is no root workspace.
