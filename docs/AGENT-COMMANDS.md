# Commands Reference

Exact developer commands for working in this repo. Run these from the respective package directories.

---

## Backend (`backend/`)

| Command | Purpose |
|---|---|
| `yarn dev` | Start dev server with `tsx watch` (hot-reload) |
| `yarn build` | Compile TypeScript with `tsc` (outputs to `dist/`) |
| `yarn start` | Run compiled app (`node dist/index.js`) |
| `yarn lint` | Run ESLint |
| `yarn format` | Format with Prettier |
| `yarn docker:up` | Start MongoDB container (Docker Compose) |
| `yarn docker:down` | Stop MongoDB container |

---

## Frontend (`frontend/`)

| Command | Purpose |
|---|---|
| `yarn dev` | Start Vite dev server (port 5173) |
| `yarn build` | Type-check + build for production (`tsc -b && vite build`) |
| `yarn lint` | Run ESLint |
| `yarn format` | Format with Prettier |
| `yarn preview` | Preview production build |

---

## Package Manager

Both packages use **Yarn 4 (Berry)** with `nodeLinker: node-modules` and `packageManager` pinned to `yarn@4.18.1`.

- Install dependencies: `yarn install --immutable` (Docker does this)
- Each package has its own `yarn.lock` and `node_modules` — there is **no root workspace**
- Enable Corepack once: `corepack enable`

---

## Docker

### Local MongoDB (for backend dev)

```bash
cd backend
yarn docker:up    # Start MongoDB container
yarn docker:down  # Stop it
```

### Monolith (single container)

```bash
# From repo root
docker build --build-arg VITE_CLERK_PUBLISHABLE_KEY=pk_xxx -t rtcamern:latest .

docker run --rm -p 3001:3001 \
  -e MONGO_URI="mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority" \
  -e DB_NAME=rtcamern \
  -e CLERK_PUBLISHABLE_KEY=pk_xxx \
  -e CLERK_SECRET_KEY=sk_xxx \
  -e FRONTEND_URL=http://localhost:3001 \
  rtcamern:latest
```

---

## Verification Steps

After making changes:
1. **Backend:** `yarn build` must pass (type-check), `yarn lint` should pass
2. **Frontend:** `yarn build` must pass (type-check + Vite build)
3. **Frontend lint:** `yarn lint` should pass

---

## Related Documentation

- [`SETUP.md`](./SETUP.md) — Full local setup guide
- [`AGENT-TYPESCRIPT.md`](./AGENT-TYPESCRIPT.md) — TypeScript & compiler quirks
- [`AGENT-GOTCHAS.md`](./AGENT-GOTCHAS.md) — Gotchas & constraints
