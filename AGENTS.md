# AGENTS.md

High-signal guidance for working in the `rtcamern` repo. Preserve only what helps avoid mistakes.

---

## Project Shape

- **Monolith, two independent packages:** `backend/` (Express API) and `frontend/` (React SPA). There is **no root `package.json` or workspace** — run Yarn inside each package.
- **Actually installed:** backend = Express 5 + Mongoose + Clerk (`@clerk/express`) + `cron`; frontend = React 19 + Vite 8 + Clerk (`@clerk/react`) + React Compiler.
- **Planned in `README.md`/`docs/` but NOT in any `package.json` yet:** Socket.IO, Hero UI, Tailwind, Multer, ImageKit, `node-cron`. Don't import these until they are added.
- **Deployment:** single Docker image (`node:22`). Frontend build → `/app/public`, backend build → `/app/dist`; the backend serves the SPA in production. MongoDB is external (Atlas). Dockerfile sets `NODE_ENV=production` + `PORT=3001`, runs as non-root `node`, and has no `EXPOSE`/`HEALTHCHECK` (Render manages health).

---

## Entrypoints & Key Paths

- **Backend entry:** `backend/src/index.ts` — mounts the Clerk webhook with `express.raw()` **before** `express.json()`, then CORS, `clerkMiddleware()`, `/health`, SPA static serving, a JSON 404 fallback, DB connect, listen, and cron start (production only).
- **Clerk webhook:** `backend/src/webhooks/clerk.webhook.ts` — verifies the Svix signature, returns 400 on verification failure vs 500 on processing failure, and upserts/deletes `User` by `clerkId`.
- **Env/constants:** `backend/src/constants/env.ts` (NODE_ENV validation, `MONGO_URI` selection, optional `CLERK_WEBHOOK_SIGNING_SECRET` — the webhook returns 503 when it is unset), `backend/src/constants/http-status.ts` (**always import status codes from here**; relative path — there is no `@/` alias).
- **DB:** `backend/src/lib/db.ts` — `mongoose.connect(MONGO_URI, { dbName: DB_NAME })`; never bake the DB name into the URI.
- **Cron:** `backend/src/lib/cron.ts` — uses the `cron` package (not `node-cron`), pings `FRONTEND_URL/health` every 14 min; started only when `NODE_ENV === "production"`.
- **Models:** `backend/src/models/{user,message}.model.ts`.
- **Frontend entry:** `frontend/src/main.tsx` (`ClerkProvider`) → `frontend/src/App.tsx` (Clerk components only).

---

## Commands & Verification

- **Backend `yarn lint` is currently broken:** it errors with "typescript-eslint does not support TS 7.0" because `backend/` pins `typescript@^7.0.2` while frontend uses `~6.0.2`. Use `yarn build` (`tsc`) as the backend type-check for now; frontend `yarn lint` works.
- Backend build first, then lint/format; full command list, local MongoDB, and the Docker monolith build live in [`docs/AGENT-COMMANDS.md`](./docs/AGENT-COMMANDS.md).

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

`docs/` also holds design notes for not-yet-built features ([`SOCKETS.md`](./docs/SOCKETS.md), [`MEDIA.md`](./docs/MEDIA.md), [`MIDDLEWARE.md`](./docs/MIDDLEWARE.md), [`UI.md`](./docs/UI.md)) — treat those as plans, not current behavior.

---

## Package Manager

Both packages use Yarn 4 (Berry) with `nodeLinker: node-modules` and `packageManager: yarn@4.18.1`. Install with `yarn install --immutable` (Docker does this). Each package has its own `yarn.lock` and `node_modules` — there is no root workspace.
