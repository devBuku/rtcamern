# Gotchas & Constraints

Non-obvious constraints and operational gotchas for working in this repo.

---

## Monolith Serving (Production)

- In production, the backend serves the built frontend from `/app/public`.
- API paths starting with `/api` are **not** served the SPA — they fall through to the JSON 404 handler via `next()`.
- Other non-API paths fall back to `index.html` (SPA routing).
- Dev runs separate servers (backend on 3000, frontend on 5173).

---

## Cron Job

- **Only runs in production:** `job.start()` runs only if `NODE_ENV === "production"`.
- Cron pings `FRONTEND_URL/health` every 14 minutes (`*/14 * * * *`).
- `FRONTEND_URL` must be reachable from the backend in production.

---

## MongoDB Connection

- **Do not concatenate DB name into URI.** Always pass `{ dbName: DB_NAME }` as a separate Mongoose option.
- In production (`NODE_ENV=production`): uses `MONGO_URI`.
- In dev/test: prefers `MONGO_URI_DOCKER`, falls back to `MONGO_URI` (trimmed).
- DB name defaults to `rtcamern`.

---

## Render Deployment

- Dockerfile removes `EXPOSE` and `HEALTHCHECK` — Render manages routing and health checks.
- Port may be provided via `PORT` env (defaults to 3001 in the Docker image).
- `NODE_ENV=production` is set in the image.

---

## Docker Monolith Build

- **Stage 1:** Frontend built (Vite) → `/app/public`
- **Stage 2:** Backend TypeScript compiled → `/app/dist`
- **Stage 3:** Runtime copies `dist/` and `public/`, runs as non-root `user`
- Uses `yarn workspaces focus --production` (dev dependencies omitted)
- Frontend `VITE_*` values are inlined at build time — pass as `--build-arg`

---

## HTTP Status Codes

- **Always import from `@/constants/http-status`** (or `./constants/http-status`).
- Never hardcode status numbers (e.g. `200`, `404`).
- Available constants: `OK`, `CREATED`, `ACCEPTED`, `NO_CONTENT`, `BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `UNPROCESSABLE_ENTITY`, `TOO_MANY_REQUESTS`, `INTERNAL_SERVER_ERROR`, `NOT_IMPLEMENTED`, `BAD_GATEWAY`, `SERVICE_UNAVAILABLE`.

---

## Secrets

- **Never commit `.env` files.** They are gitignored.
- Only `.env.example` is committed.
- Frontend `.env` contains `VITE_CLERK_PUBLISHABLE_KEY` (safe for client).
- Backend `.env` contains secrets (`CLERK_SECRET_KEY`, `IMAGEKIT_PRIVATE_KEY`, etc.) — never expose.

---

## Related Documentation

- [`ENV.md`](./ENV.md) — Environment variables reference
- [`AGENT-TYPESCRIPT.md`](./AGENT-TYPESCRIPT.md) — TypeScript & compiler quirks
- [`DEPLOYMENT.md`](./DEPLOYMENT.md) — Deployment guide
