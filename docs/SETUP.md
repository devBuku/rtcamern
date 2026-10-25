# Setup Guide

This guide covers setting up the **rtcamern** project locally for development. Since this is a hand-coded learning project, follow these steps to run both the frontend and backend in your local environment.

---

## Prerequisites

Before getting started, ensure you have the following installed and configured:

| Tool | Version (Recommended) | Purpose | Notes |
|---|---|---|---|
| **[Node.js](https://nodejs.org/)** | LTS (v20+ recommended) | Runtime for both frontend and backend | Check with `node -v` |
| **[Yarn](https://yarnpkg.com/)** | v4+ (Berry) | Package manager | Both packages pin `yarn@4.18.1` via the `packageManager` field (run `corepack enable` once). |
| **[MongoDB](https://www.mongodb.com/)** | 6.x+ or MongoDB Atlas | Database | You can use a local MongoDB instance (`mongodb://localhost:27017`) or [MongoDB Atlas](https://www.mongodb.com/atlas) (free tier). |
| **[Git](https://git-scm.com/)** | Latest | Version control | To clone the repository. |
| **[Clerk Account](https://clerk.com/)** | Free | Authentication | Required for auth. Sign up for free and create an app. |
| **[ImageKit Account](https://imagekit.io/)** | Free | Media hosting & transformations | Required for media uploads. Free tier available. |

---

## 1. Clone the Repository

```bash
git clone <your-repo-url>
cd rtcamern
```

---

## 2. Backend Setup

### Step 2a: Install Dependencies

Navigate to the backend directory and install dependencies:

```bash
cd backend
yarn install
```

Both packages use Yarn Berry (`yarn@4.18.1`) with `nodeLinker: node-modules` (see `.yarnrc.yml`), so dependencies install into a standard `node_modules` folder. Enable Corepack once with `corepack enable` so the pinned Yarn version is used.

### Step 2b: Configure Environment Variables

1. Copy the example env file:

```bash
cp .env.example .env
```

2. Open `.env` and update the values as needed. The example file contains:

```env
NODE_ENV=development
PORT=3000

MONGO_URI=mongodb://your-production-mongo-uri
MONGO_URI_DOCKER=mongodb://localhost:27017
DB_NAME=rtcamern

CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SIGNING_SECRET=

FRONTEND_URL=http://localhost:5173

IMAGEKIT_PRIVATE_KEY=
IMAGEKIT_URL_ENDPOINT=
IMAGEKIT_ID=
```

- `NODE_ENV`: Environment mode (`development`, `production`, or `test`). In production uses `MONGO_URI`; in development/test prefers `MONGO_URI_DOCKER` (falls back to `MONGO_URI`).
- `PORT`: Port for the Express server (default: 3000)
- `MONGO_URI`: MongoDB connection string (without DB name) for production.
- `MONGO_URI_DOCKER`: MongoDB connection string (without DB name) for local development/test (used with Docker).
- `DB_NAME`: Database name (default: `rtcamern`).
- `CLERK_SECRET_KEY`: Required for Clerk session verification. `CLERK_PUBLISHABLE_KEY` is also listed in the example for parity with Clerk's dashboard.
- `CLERK_WEBHOOK_SIGNING_SECRET`: Optional; the webhook responds `503` when unset.
- `FRONTEND_URL`: Frontend URL for CORS (default: `http://localhost:5173`).
- `IMAGEKIT_PRIVATE_KEY`, `IMAGEKIT_URL_ENDPOINT`, `IMAGEKIT_ID`: **all required** — the server throws at import time without them.

Env is validated when the module is imported, so `.env` must exist before `yarn dev`, and commands must run from `backend/` (`dotenv` reads the current directory).

See [`ENV.md`](./ENV.md) for detailed explanations of every variable.

### Step 2c: Start MongoDB (Docker) or use local MongoDB

**Option A: Use Docker Compose (recommended for local dev)**
```bash
yarn docker:up
```
This starts MongoDB in the background. To stop it:
```bash
yarn docker:down
```

**Option B: Use local MongoDB**
Ensure MongoDB is running on your machine (`mongod`).

With `NODE_ENV=development` or `test`, the backend prefers `MONGO_URI_DOCKER` (falls back to `MONGO_URI` if not set). In production (`NODE_ENV=production`), it uses `MONGO_URI`.

### Step 2d: Start the Development Server

```bash
yarn dev
```

This runs the backend with `tsx watch` for hot-reloading on changes to `src/index.ts`.

You should see output similar to:

```text
Server is listening on port: 3000
```

You can test the health endpoint:

```bash
curl http://localhost:3000/health
# Returns: {"ok":true}
```

---

## 3. Frontend Setup

### Step 3a: Install Dependencies

Open a new terminal window/tab and navigate to the frontend:

```bash
cd frontend
yarn install
```

Create `frontend/.env` (there is no `.env.example` yet) with the publishable key:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

### Step 3b: Start the Development Server

```bash
yarn dev
```

Vite will start the dev server, typically on `http://localhost:5173` (check terminal output).

You can open this URL in your browser to view the app.

---

## 4. Running Both Together (Recommended Workflow)

For local development, you'll typically need both servers running simultaneously:

| Terminal | Directory | Command | Purpose |
|---|---|---|---|
| **1** | `backend/` | `yarn dev` | Express + Socket.IO server (port 3000 by default) |
| **2** | `frontend/` | `yarn dev` | Vite dev server (port 5173 by default) |

Keep both terminals open while developing.

---

## 5. Project Structure Overview

```text
rtcamern/
├── backend/        # Express + TypeScript API server
│   ├── src/        # Source code (routes, controllers, models, etc.)
│   ├── .env        # Local environment variables (gitignored)
│   ├── .env.example
│   └── package.json
├── frontend/       # React + Vite + TypeScript client
│   ├── src/        # Components, assets, styles
│   └── package.json
├── docs/           # Project documentation (this folder)
└── AGENTS.md       # Agent instructions
```

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for a deeper breakdown of the folder structure and its purpose.

---

## 5b. Running as a Single Docker Container

If you want to run the whole app as one container (Express serving the built frontend, MongoDB in Atlas), build the root `Dockerfile`:

```bash
# from repo root
docker build --build-arg VITE_CLERK_PUBLISHABLE_KEY=pk_xxx -t rtcamern:latest .

docker run --rm -p 3001:3001 \
  -e MONGO_URI="mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority" \
  -e DB_NAME=rtcamern \
  -e CLERK_SECRET_KEY=sk_xxx \
  -e IMAGEKIT_PRIVATE_KEY=private_xxx \
  -e IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_id/ \
  -e IMAGEKIT_ID=your_id \
  -e FRONTEND_URL=http://localhost:3001 \
  rtcamern:latest
```

Then open `http://localhost:3001`. Because `NODE_ENV=production` is set in the image, the backend reads `MONGO_URI` (not `MONGO_URI_DOCKER`). Frontend `VITE_*` values are inlined at build time, so pass them as `--build-arg`. The image sets `PORT=3001` and has no `EXPOSE` instruction, so publish the port explicitly with `-p`.

---

## 6. Common Setup Issues

| Issue | Cause | Solution |
|---|---|---|
| **Port already in use** | Another process is running on port 3000/5173 | Change `PORT` in `backend/.env` or use `--port` for Vite. |
| **MongoDB connection fails** | Local MongoDB not running | Start `mongod` service, or use MongoDB Atlas URI (`MONGO_URI_DOCKER` takes precedence in dev). |
| **Server exits with "IMAGEKIT_PRIVATE_KEY is not found!!"** | ImageKit vars missing | All three `IMAGEKIT_*` vars are required at startup — fill them in `backend/.env`. |
| **Yarn Berry issues** | Cache/.yarn state | Try `yarn install --immutable` or check `.yarnrc.yml`. Avoid mixing npm/yarn. |
| **TypeScript errors** | Missing types or version mismatches | Ensure dependencies match `package.json`. Let TypeScript guide fixes. |

For more issues, see [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md).

---

## Next Steps

- As you implement features, document them in the relevant files under `docs/`.
- Keep `.env` files out of git (they're already in `.gitignore`).
- Check [`BUGS.md`](../BUGS.md) before touching Socket.IO.

---

*Last updated: reflects the current backend (Clerk, messages, uploads, webhooks, cron, partial Socket.IO), the required env vars, and the single-container Docker flow.*