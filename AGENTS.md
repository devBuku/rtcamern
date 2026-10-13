# AGENTS.md

This file gives high-signal guidance for working in the `rtcamern` repo. Preserve only what helps avoid mistakes.

---

## Project Shape

- **Type:** Monolith (backend serves frontend in production). 
- **Stacks:** Backend TypeScript (Express + Mongoose + Socket.IO + Clerk), Frontend TypeScript (React + Vite + Hero UI + Clerk). 
- **Deployment:** Single Docker image; backend copies built frontend to `/app/public` and serves it with `express.static`. MongoDB is external (MongoDB Atlas). Render is used (Dockerfile has no `EXPOSE`/`HEALTHCHECK`).

---

## Entrypoints & Key Paths

- **Backend entry:** `backend/src/index.ts` — sets CORS (uses `FRONTEND_URL`), `clerkMiddleware`, serves `/health`, in prod serves SPA from `publicDir = ../public` (resolves relative to `dist/index.js`), falls through API paths to 404, connects DB, starts server, starts cron in production.
- **Backend build:** `backend/tsconfig.json` -> `./dist`. `yarn build` runs `tsc`, `yarn start` runs `node dist/index.js`.
- **Frontend entry:** `frontend/src/main.tsx` wrapped with `ClerkProvider`, `frontend/src/App.tsx` uses Clerk components.
- **Frontend build:** `frontend/vite.config.ts` (Vite + React Compiler via Babel). `yarn build` does `tsc -b && vite build`, outputs to `frontend/dist`.
- **Constants:** `backend/src/constants/env.ts` (NODE_ENV validation, MONGO_URI selection, `FRONTEND_URL`), `backend/src/constants/http-status.ts` (use these for status codes).
- **DB:** `backend/src/lib/db.ts` uses `mongoose.connect(MONGO_URI, { dbName: DB_NAME })` (DB name separate from URI).
- **Cron:** `backend/src/lib/cron.ts` pings `FRONTEND_URL/health` every 14 min (`*/14 * * * *`) in production via `NODE_ENV` check (started in `index.ts`).
- **Models:** `backend/src/models/user.model.ts`, `backend/src/models/message.model.ts` (TS interfaces + schemas).

---

## Commands

### Backend (`backend/`)
- `yarn dev` – run with `tsx watch ./src/index.ts`
- `yarn build` – `tsc` (outputs to `dist/`)
- `yarn start` – `node dist/index.js`
- `yarn format` – Prettier
- `yarn docker:up` / `yarn docker:down` – Docker Compose (standalone MongoDB for local dev)

### Frontend (`frontend/`)
- `yarn dev` – Vite dev server
- `yarn build` – `tsc -b && vite build`
- `yarn lint` – ESLint
- `yarn format` – Prettier
- `yarn preview` – preview build

Both use Yarn 4 (Berry) with `nodeLinker: node-modules` and `packageManager` pinned. Install with `yarn install --immutable` (Docker does this).

---

## Environment

Backend `.env.example` defines:
- `NODE_ENV` (development|production|test) – validated; in production uses `MONGO_URI`, in dev/test prefers `MONGO_URI_DOCKER`, falls back to `MONGO_URI` (trimmed). 
- `PORT` (default 3000 in code; Docker/runtime may set 3001)
- `MONGO_URI`, `MONGO_URI_DOCKER`, `DB_NAME` (default `rtcamern`) – DB name passed via Mongoose `dbName`.
- `FRONTEND_URL` – CORS origin and used by cron health ping (default `http://localhost:5173`).
- Clerk/ImageKit keys as defined.

Frontend uses `VITE_*` vars (e.g. `VITE_CLERK_PUBLISHABLE_KEY`). In Docker build, frontend build takes `VITE_CLERK_PUBLISHABLE_KEY` as build arg; `VITE_API_URL` is empty so client calls same origin in monolith.

---

## Gotchas / Constraints

- **Monolith serving:** In production, API paths starting with `/api` are not served the SPA (`next()`); other non-API paths fall back to `index.html`. Dev runs separate servers.
- **Cron only in production:** `job.start()` runs only if `NODE_ENV === "production"`. Cron pings `FRONTEND_URL/health` (so `FRONTEND_URL` must be reachable in prod).
- **Mongo selection:** Do not concatenate DB name into URI; always pass `{ dbName: DB_NAME }`. Trimming applied.
- **Render deployment:** Dockerfile removes `EXPOSE` and `HEALTHCHECK` (Render manages routing/health). Port may be provided via `PORT` env.
- **Docker monolith:** Frontend built in first stage, backend TS compiled in second, runtime copies `dist/` and `public/`. Runs as non-root `node`. Uses `yarn workspaces focus --production`.
- **TypeScript:** Backend uses CommonJS-style output via `tsc` (`module: nodenext`, `verbatimModuleSyntax: false`). Use `tsx` for local dev.
- **HTTP status:** Import from `@/constants/http-status` (or `./constants/http-status`) — avoid hardcoded numbers (e.g. `OK`, `NOT_FOUND`).
- **Secrets:** Never commit `.env` (it may exist locally). Only `.env.example` is committed.

---

## Conventions & Agent Behavior

- **Non-intrusive:** Don't scaffold large portions; preserve hand-written learning approach.
- **Verify before changing:** Read executable sources (scripts/config) over docs if conflict. Investigate unfamiliar files before overwriting.
- **Docs sync:** When modifying behavior (env, endpoints, sockets, middleware, cron), update relevant `docs/*.md` and keep `README.md` as entry point.
- **Minimal edits:** Prefer `edit` for targeted changes, `write` only for new files or full replacements. Don't chain noisy shell separators.
- **Commit discipline:** Follow existing commit style from history (conventional-like, concise). 
- **Read full files when needed:** Diffs insufficient — read full affected files for context.
- **Simple & specific:** Only keep repo-specific, high-signal guidance. If obvious from code/config, omit.