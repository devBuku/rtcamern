# AGENTS.md

High-signal guidance for working in the `rtcamern` repo. Preserve only what helps avoid mistakes.

---

## Project Shape

- **Monolith, two independent packages:** `backend/` (Express API) and `frontend/` (React SPA). There is **no root `package.json` or workspace** — run Yarn inside each package.
- **Actually installed:** backend = Express 5 + Mongoose + Clerk (`@clerk/express`) + `cron` (plus `bcryptjs`/`jsonwebtoken`, present but unused — Clerk handles auth); frontend = React 19 + Vite 8 + Clerk (`@clerk/react`) + React Compiler.
- **Planned in `README.md`/`docs/` but NOT in any `package.json` yet:** Socket.IO, Hero UI, Tailwind, Multer, ImageKit, `node-cron`. Don't import these until they are added — the README/docs describe aspirations, not the current code.
- **Deployment:** single Docker image (`node:22`). Frontend build → `/app/public`, backend build → `/app/dist`; the backend serves the SPA in production. MongoDB is external (Atlas). Dockerfile sets `NODE_ENV=production` + `PORT=3001`, runs as non-root `node`, and has no `EXPOSE`/`HEALTHCHECK` (Render manages health).

---

## Entrypoints & Key Paths

- **Backend entry:** `backend/src/index.ts` — mounts the Clerk webhook with `express.raw()` **before** `express.json()` (signature verification needs the raw body), then CORS, `clerkMiddleware()`, `/health`, the `/api/auth` router, SPA static serving (`/api/*` deliberately falls through to a JSON 404), DB connect, listen, and cron start (production only).
- **Clerk webhook:** `backend/src/webhooks/clerk.webhook.ts` — verifies the Svix signature via `verifyWebhook` from `@clerk/backend/webhooks`, which is **not in `package.json`** (transitive dep of `@clerk/express`; resolves only because `nodeLinker: node-modules` hoists it). Returns 400 on verification failure, 500 on processing failure, **503 when `CLERK_WEBHOOK_SIGNING_SECRET` is unset**; upserts/deletes `User` by `clerkId`.
- **Auth layer:** router `backend/src/routes/auth.route.ts` → `authMiddleware` (`backend/src/middlewares/auth.middleware.ts`) → controller `backend/src/controllers/auth.controller.ts`. The middleware resolves `getAuth(req)`, loads `User` by `clerkId`, and sets `req.user` — a **global augmentation typed optional** in `backend/src/types/express.d.ts`, so every handler must guard `req.user`. `GET /api/auth/me` returns `{ success: true, user }` and **404s for Clerk users not yet in MongoDB** (sync is webhook-only; there is no lazy sync). Response shapes are not uniform yet: successes use `{ success: true, ... }` per `docs/API.md`, `/health` uses `{ ok: true }`, error paths use bare `{ message }`.
- **Env/constants:** `backend/src/constants/env.ts` **runs validation at import time and throws** if no MongoDB URI is set — the server won't start without `backend/.env`; `dotenv/config` loads `.env` from the process cwd, so run backend commands from `backend/`. Dev/test prefers `MONGO_URI_DOCKER`, production requires `MONGO_URI`. Frontend `VITE_*` vars belong in `frontend/.env` — Vite only reads its project root (a repo-root `.env` is ignored by both Vite and the backend). `CLERK_WEBHOOK_SIGNING_SECRET` is optional (webhook 503s without it).
- **Status codes:** always import from `backend/src/constants/http-status.ts` (relative path — there is no `@/` alias in `backend/tsconfig.json`).
- **DB:** `backend/src/lib/db.ts` — `mongoose.connect(MONGO_URI, { dbName: DB_NAME })`; never bake the DB name into the URI.
- **Cron:** `backend/src/lib/cron.ts` — uses the `cron` package (not `node-cron`), pings `FRONTEND_URL/health` every 14 min; `job.start()` only when `NODE_ENV === "production"`.
- **Models:** `backend/src/models/{user,message}.model.ts`.
- **Frontend entry:** `frontend/src/main.tsx` (`ClerkProvider`) → `frontend/src/App.tsx` (Clerk sign-in/out components only — no router or pages yet).

---

## Verification

- **There is no test suite, no CI workflow, and no pre-commit hook.** Verification is builds + frontend lint, in this order:
  1. `backend/`: `yarn build` (tsc type-check — the only backend check that works)
  2. `frontend/`: `yarn build` (`tsc -b && vite build`) and `yarn lint`
- **Backend `yarn lint` is broken:** it crashes with "typescript-eslint does not support TS 7.0" because `backend/` pins `typescript@^7.0.2` while frontend uses `~6.0.2`. Don't try to work around it as a side effect; use `yarn build` as the backend type-check.
- Full command list, local MongoDB, and the Docker monolith build live in [`docs/AGENT-COMMANDS.md`](./docs/AGENT-COMMANDS.md).

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
| REST API | [`docs/API.md`](./docs/API.md) |
| Auth & webhooks | [`docs/AUTH.md`](./docs/AUTH.md) |
| Webhooks & cron | [`docs/WEBHOOKS_CRON.md`](./docs/WEBHOOKS_CRON.md) |
| Database models | [`docs/DATABASE.md`](./docs/DATABASE.md) |
| Deployment | [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) |
| Troubleshooting | [`docs/TROUBLESHOOTING.md`](./docs/TROUBLESHOOTING.md) |

`docs/` also holds design notes for not-yet-built features ([`SOCKETS.md`](./docs/SOCKETS.md), [`MEDIA.md`](./docs/MEDIA.md), [`MIDDLEWARE.md`](./docs/MIDDLEWARE.md), [`UI.md`](./docs/UI.md)) — treat those as plans, not current behavior. `README.md` is likewise partly aspirational (roadmap features listed as done).

---

## Package Manager

Both packages use Yarn 4 (Berry) with `nodeLinker: node-modules` and `packageManager: yarn@4.18.1`. Install with `yarn install --immutable` (Docker does this). Each package has its own `yarn.lock` and `node_modules` — there is no root workspace.
