# Environment Variables

This document explains all environment variables used in the **rtcamern** project. It covers what each variable is for, where to get it, and safe defaults for local development.

Since this is a learning project, understanding each variable and its purpose is important. As features are implemented (Clerk, ImageKit, CORS, etc.), this file will be updated to reflect the actual `.env` requirements.

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

### Planned Variables (To be added as implemented)

These will be added as authentication, media, webhooks, and deployment features are built:

| Variable | Type | Required | Purpose | Where to Get It |
|---|---|---|---|---|
| **`CLERK_SECRET_KEY`** | `string` | Yes (Auth) | Clerk backend API key for verifying JWTs and calling Clerk APIs. | [Clerk Dashboard → API Keys → Secret Keys](https://dashboard.clerk.com/last-active?path=api-keys) |
| **`CLERK_PUBLISHABLE_KEY`** | `string` | Yes (Auth) | Publishable key used by the `@clerk/express` middleware to resolve the Clerk frontend API. Required at runtime on the backend (a request fails without it). | Same value as the frontend publishable key. |
| **`CLERK_WEBHOOK_SIGNING_SECRET`** | `string` | Yes (Webhooks) | Webhook signing secret to verify Clerk webhook events. | [Clerk Dashboard → Webhooks → Signing Secret](https://dashboard.clerk.com/last-active?path=webhooks) |
| **`IMAGEKIT_PUBLIC_KEY`** | `string` | Yes (Media) | ImageKit public key for client-side uploads (if used) and SDK auth. | [ImageKit Dashboard → Developer Options → API Keys](https://imagekit.io/dashboard/developer/api-keys) |
| **`IMAGEKIT_PRIVATE_KEY`** | `string` | Yes (Media) | ImageKit private key for server-side uploads. **Never expose to frontend.** | Same as above. |
| **`IMAGEKIT_URL_ENDPOINT`** | `string` | Yes (Media) | ImageKit URL endpoint (e.g., `https://ik.imagekit.io/your_id/`). | [ImageKit Dashboard → URL Endpoints](https://imagekit.io/dashboard/url-endpoints) |

---

## Frontend Environment Variables

Frontend environment variables live in `frontend/.env`. Vite requires variables to be prefixed with `VITE_` to be exposed to the client bundle.

### Current State

The frontend is currently a Vite + React template with no custom env variables yet.

### Planned Variables (To be added as implemented)

| Variable | Type | Required | Purpose | Where to Get It |
|---|---|---|---|---|
| **`VITE_CLERK_PUBLISHABLE_KEY`** | `string` | Yes (Auth) | Clerk publishable key for frontend authentication. | [Clerk Dashboard → API Keys → Publishable Keys](https://dashboard.clerk.com/last-active?path=api-keys) |
| **`VITE_API_URL`** | `string` | Yes (API) | Base URL for backend REST API. | `http://localhost:3000` for local dev. Update on deployment (e.g., Railway/Render URL). |
| **`VITE_SOCKET_URL`** | `string` | Yes (Socket.IO) | WebSocket server URL for Socket.IO client connection. | Usually same as API URL (`http://localhost:3000`) when same server hosts Socket.IO. Update on deployment. |
| **`VITE_IMAGEKIT_URL_ENDPOINT`** | `string` | Optional | ImageKit URL endpoint for displaying images. Can be same as backend or exposed if needed. | [ImageKit Dashboard](https://imagekit.io/dashboard/url-endpoints) |

---

## `.env.example` Files

- **`backend/.env.example`** – Should contain placeholder values for all required backend env vars with comments explaining each (as features are added).
- **`frontend/.env.example`** – Should contain placeholder values for all `VITE_*` vars with comments (as features are added).

Keeping `.env.example` up to date is crucial for new contributors and for documenting the setup process. This will be maintained alongside code changes.

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

*Last updated: Reflects current state (PORT, MONGO_URI). Will be expanded as Clerk, ImageKit, and other integrations are implemented.*