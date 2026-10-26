# Environment Variables

This document explains all environment variables used in the **rtcamern** project. It covers what each variable is for, where to get it, and safe defaults for local development.

Since this is a learning project, understanding each variable and its purpose is important. This file tracks the actual `.env` requirements; optional/planned variables are called out.

---

## Backend Environment Variables

Backend environment variables live in `backend/.env`. An example is provided in `backend/.env.example`.

### Current Variables

| Variable | Type | Required | Default | Purpose | Notes |
|---|---|---|---|---|---|
| **`PORT`** | `number` | Yes | `3000` | Port on which the Express server runs. | Can be changed if port 3000 is already in use. |
| **`NODE_ENV`** | `string` | Recommended | `development` | Environment mode (`development`, `production`, `test`). In production uses `MONGO_URI`; in development/test prefers `MONGO_URI_DOCKER` (falls back to `MONGO_URI`). Affects logging, CORS, and error handling. |
| **`MONGO_URI`** | `string` | Yes (prod) | `mongodb://your-production-mongo-uri` | MongoDB connection string (without database name) used when `NODE_ENV=production`. | Use MongoDB Atlas or production URI. |
| **`MONGO_URI_DOCKER`** | `string` | Optional (dev/test) | `mongodb://localhost:27017` | MongoDB connection string (without database name) used when `NODE_ENV=development` or `test`. | Preferred for local Docker dev. If not set, falls back to `MONGO_URI`. |
| **`DB_NAME`** | `string` | Optional | `rtcamern` | Database name passed to Mongoose (`dbName`). | Kept separate from URI so same cluster can host multiple databases cleanly. |
| **`FRONTEND_URL`** | `string` | Optional | `http://localhost:5173` | Frontend URL allowed for CORS and used for allowed origins. | Update on deployment (e.g., Netlify/Vercel URL). |
| **`CLERK_PUBLISHABLE_KEY`** | `string` | Optional | — | Present in `.env.example` for parity with Clerk's dashboard. | **Not read by the backend code** — the frontend uses `VITE_CLERK_PUBLISHABLE_KEY`. |
| **`CLERK_SECRET_KEY`** | `string` | Yes (Auth) | — | Clerk backend secret key for verifying JWTs and calling Clerk APIs. | Never expose to frontend. |
| **`CLERK_WEBHOOK_SIGNING_SECRET`** | `string` | Optional (Webhooks) | — | Webhook signing secret to verify Clerk webhook events. | The webhook returns `503` when unset. |
| **`IMAGEKIT_PRIVATE_KEY`** | `string` | Yes (Media) | — | ImageKit private key used server-side by `@imagekit/nodejs`. **Never expose to frontend.** | Validated at import time; the server won't start without it. |
| **`IMAGEKIT_URL_ENDPOINT`** | `string` | Yes (Media) | — | ImageKit URL endpoint (e.g., `https://ik.imagekit.io/your_id/`). | Validated at import time. Currently reserved for URL building. |
| **`IMAGEKIT_ID`** | `string` | Yes (Media) | — | ImageKit account identifier from the dashboard. | Validated at import time. Currently unused by the upload path. |

### Future Variables

None at the moment. Add new backend variables here as features land.

---

## Frontend Environment Variables

Frontend environment variables live in `frontend/.env`. Vite requires variables to be prefixed with `VITE_` to be exposed to the client bundle.

### Current Variables

| Variable | Type | Required | Purpose | Where to Get It |
|---|---|---|---|---|
| **`VITE_CLERK_PUBLISHABLE_KEY`** | `string` | Yes (Auth) | Clerk publishable key for frontend authentication. | [Clerk Dashboard → API Keys → Publishable Keys](https://dashboard.clerk.com/last-active?path=api-keys) |

### Planned Variables (To be added as implemented)

| Variable | Type | Required | Purpose | Where to Get It |
|---|---|---|---|---|
| **`VITE_API_URL`** | `string` | Yes (API) | Base URL for backend REST API. | `http://localhost:3000` for local dev. Update on deployment (e.g., Railway/Render URL). |
| **`VITE_SOCKET_URL`** | `string` | Yes (Socket.IO) | WebSocket server URL for Socket.IO client connection. | Usually same as API URL (`http://localhost:3000`) when same server hosts Socket.IO. Update on deployment. |
| **`VITE_IMAGEKIT_URL_ENDPOINT`** | `string` | Optional | ImageKit URL endpoint for displaying images. Can be same as backend or exposed if needed. | [ImageKit Dashboard](https://imagekit.io/dashboard/url-endpoints) |

---

## `.env.example` Files

- **`backend/.env.example`** – Exists and lists every backend variable (Mongo, Clerk, ImageKit, `FRONTEND_URL`).
- **`frontend/.env.example`** – Exists with `VITE_CLERK_PUBLISHABLE_KEY`.

Keeping examples up to date is crucial for new contributors and for documenting the setup process. This will be maintained alongside code changes.

---

## Security Notes

- **Never commit `.env` files** to version control. They are already gitignored.
- **Keep secrets safe:** `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SIGNING_SECRET`, and `IMAGEKIT_PRIVATE_KEY` must only be used on the backend.
- **Frontend exposure:** Only use `VITE_*` prefixed variables for values that are safe to be bundled into the client.
- **Rotate keys if exposed:** If any secret is accidentally committed, rotate it immediately via the respective dashboard.

---

## Related Documentation

- [`SETUP.md`](./SETUP.md) – How to configure and use these variables locally
- [`AUTH.md`](./AUTH.md) – Clerk authentication setup and flow
- [`MEDIA.md`](./MEDIA.md) – ImageKit configuration and usage
- [`DEPLOYMENT.md`](./DEPLOYMENT.md) – Environment setup for production deployments
- [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md) – Env-related issues and fixes

---

*Last updated: reflects the server, MongoDB, Clerk, ImageKit, and upload variables actually read by the code; frontend currently needs only `VITE_CLERK_PUBLISHABLE_KEY`.*