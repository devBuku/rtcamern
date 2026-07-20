# rtcamern

MERN + Socket.io chat app. Monorepo with `server/` and `client/`.

## Structure

- `server/` — Express (ESM, Node.js), entry `src/server.js` → `app.js` (currently skeleton: only `/health` route). Empty dirs exist for `config/`, `routes/`, `models/`, `controllers/`, `lib/`, `webhooks/`.
- `client/` — React 19 + Vite 8 with React Compiler enabled. Entry `src/main.jsx`.

## Commands

| Package | Command | Notes |
|---------|---------|-------|
| server | `pnpm dev` | Nodemon on `src/server.js` — requires MongoDB |
| client | `pnpm dev` | Vite dev server |
| client | `pnpm build` | Vite production build |
| client | `pnpm lint` | ESLint (flat config, `eslint.config.js`) |
| client | `pnpm preview` | Vite preview server |

No tests exist on either side.

## Prerequisites

- **pnpm** (>=11.14) — required by both packages (`devEngines` check in server `package.json`)
- **MongoDB** — `docker compose up` in `server/` starts a `mongo` container on port 27017
- `.env` — copy `server/.env.example` to `server/.env`; default `PORT=3000`

## Conventions

- ESM throughout (`"type": "module"` in both `package.json`)
- `.js` extensions for all imports (no `.mjs`)
- Client uses JSX (`.jsx`), not TypeScript
- Server side is JavaScript only
- React Compiler is active on the client (Babel plugin in `vite.config.js`)
