# Setup Guide

This guide covers setting up the **rtcamern** project locally for development. Since this is a hand-coded learning project, follow these steps to run both the frontend and backend in your local environment.

---

## Prerequisites

Before getting started, ensure you have the following installed and configured:

| Tool | Version (Recommended) | Purpose | Notes |
|---|---|---|---|
| **[Node.js](https://nodejs.org/)** | LTS (v20+ recommended) | Runtime for both frontend and backend | Check with `node -v` |
| **[Yarn](https://yarnpkg.com/)** | v4+ (Berry) | Package manager | The backend uses Yarn Berry (`yarn@4.18.1` per package.json). Frontend also uses yarn.lock. |
| **[MongoDB](https://www.mongodb.com/)** | 6.x+ or MongoDB Atlas | Database | You can use a local MongoDB instance (`mongodb://localhost:27017`) or [MongoDB Atlas](https://www.mongodb.com/atlas) (free tier). |
| **[Git](https://git-scm.com/)** | Latest | Version control | To clone the repository. |
| **[Clerk Account](https://clerk.com/)** | Free | Authentication | Required later for auth. Sign up for free and create an app. |
| **[ImageKit Account](https://imagekit.io/)** | Free | Media hosting & transformations | Required later for media uploads. Free tier available. |

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

The backend uses Yarn Berry (Pnp mode enabled via `.yarnrc.yml`). This is intentional and matches the current setup.

### Step 2b: Configure Environment Variables

1. Copy the example env file:

```bash
cp .env.example .env
```

2. Open `.env` and update the values as needed. Currently it contains:

```env
NODE_ENV=development
PORT=3000
MONGO_URI=mongodb://your-production-mongo-uri
MONGO_URI_DOCKER=mongodb://localhost:27017
DB_NAME=rtcamern
```

- `NODE_ENV`: Environment mode (`development`, `production`, or `test`). In production uses `MONGO_URI`; in development/test prefers `MONGO_URI_DOCKER` (falls back to `MONGO_URI`).
- `PORT`: Port for the Express server (default: 3000)
- `MONGO_URI`: MongoDB connection string (without DB name) for production.
- `MONGO_URI_DOCKER`: MongoDB connection string (without DB name) for local development/test (used with Docker).
- `DB_NAME`: Database name (default: `rtcamern`).

See [`ENV.md`](./ENV.md) for detailed explanations of all environment variables (including Clerk, ImageKit, etc. as they are added).

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
# Returns: {"message": "I am healthy"}
```

---

## 3. Frontend Setup

### Step 3a: Install Dependencies

Open a new terminal window/tab and navigate to the frontend:

```bash
cd frontend
yarn install
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

## 6. Common Setup Issues

| Issue | Cause | Solution |
|---|---|---|
| **Port already in use** | Another process is running on port 3000/5173 | Change `PORT` in `backend/.env` or use `--port` for Vite. |
| **MongoDB connection fails** | Local MongoDB not running | Start `mongod` service, or use MongoDB Atlas URI. |
| **Yarn Berry issues** | Cache/.yarn state | Try `yarn install --immutable` or check `.yarnrc.yml`. Avoid mixing npm/yarn. |
| **TypeScript errors** | Missing types or version mismatches | Ensure dependencies match `package.json`. Let TypeScript guide fixes. |

For more issues, see [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md).

---

## Next Steps

- As you implement features, document them in the relevant files under `docs/`.
- Share key files/folders at each stage for UI polish and documentation review (per AGENTS.md).
- Keep `.env` files out of git (they're already in `.gitignore`).

---

*Last updated: Initial setup guide reflecting current backend/frontend foundation.*