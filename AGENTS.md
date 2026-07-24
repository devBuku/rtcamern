# rtcamern

MERN + Socket.io chat app. Monorepo with `backend/` and `frontend/`.

## Structure

- `backend/` — Express (ESM, Node.js), entry `src/server.js` → `src/app.js`. Routes: `/api/auth`, `/api/messages`. Models dir exists but is empty. Controllers: `auth.controller.js`. MongoDB via Mongoose.
- `frontend/` — React 19 + Vite 8. Entry `src/main.jsx`. Plain `@vitejs/plugin-react` (no React Compiler, no SWC).

## Commands

All use **npm** (not pnpm — pnpm will fail `devEngines` check).

| Package | Command | Notes |
|---------|---------|-------|
| backend | `npm run dev` | Nodemon on `src/server.js` — requires MongoDB |
| backend | `npm start` | `node ./src/server.js` |
| frontend | `npm run dev` | Vite dev server |
| frontend | `npm run build` | Vite production build |
| frontend | `npm run lint` | ESLint (flat config, `eslint.config.js`) |
| frontend | `npm run preview` | Vite preview server |
| root | `npm run build` | Installs deps in both packages + builds frontend |

No tests exist on either side.

## Prerequisites

- **MongoDB** — `docker compose up` in `backend/` starts a `mongo` container named `rtcamern` on port 27017
- `.env` — copy `backend/.env.example` to `backend/.env`; defaults: `PORT=3000`, `MONGO_URI=mongodb://localhost:27017/rtcamern`

## Conventions

- ESM in both packages (`"type": "module"`); root `package.json` is `"commonjs"` (root scripts only)
- `.js` extensions for all imports (no `.mjs`)
- Client uses `.jsx`, not TypeScript (but `@types/react` are installed as dev deps)
- Server side is JavaScript only
