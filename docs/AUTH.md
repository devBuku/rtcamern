# Authentication

This document explains the authentication system for **rtcamern**. Authentication is handled via [Clerk](https://clerk.com/), with the backend verifying tokens and syncing users to MongoDB. It also covers protected routes, user lifecycle, and webhooks.

This is a learning-focused explanation—focusing on the flow, "why", and how it integrates with the rest of the app.

---

## Overview

Clerk is used as the authentication provider for:
- Sign-up, sign-in, and session management (frontend)
- JWT issuance for authenticated requests
- User profile management
- Webhooks for user lifecycle events (created, updated, deleted)

The backend verifies Clerk-issued tokens on protected REST routes. Socket.IO connections are **not** authenticated yet — the handshake trusts a `userId` query parameter (see [`BUGS.md`](../BUGS.md)). App-specific user data (online status, preferences, etc.) is stored in the MongoDB `User` model (see [`DATABASE.md`](./DATABASE.md)).

---

## Why Clerk?

- **Free tier available** – aligns with "100% Free Tools" requirement.
- **Frontend SDK + Backend SDK** – clean separation for React and Express.
- **JWT-based auth** – easy to verify on both REST and WebSocket layers.
- **Webhooks support** – enables reliable user sync even if users change data in Clerk.
- **Built-in UI** – speeds up auth UI so focus stays on chat/realtime features (great for learning).

---

## Authentication Flow

### 1. Frontend Authentication (Partial)

1. **Wrap app with ClerkProvider:** `frontend/src/main.tsx` wraps the app with `ClerkProvider` using `VITE_CLERK_PUBLISHABLE_KEY`.
2. **Sign-in/Sign-up:** `frontend/src/App.tsx` renders Clerk's pre-built `<SignIn />` / `<SignUp />` components.
3. **Protected routes:** still planned — there is no router or page structure yet.
4. **Get auth token:** For API calls, use `getToken()` from `@clerk/react` (or rely on Clerk's session cookie) and send the request with credentials.
5. **Client-side user info:** Use `useUser()` to access authenticated user details from Clerk.

### 2. Backend Token Verification

1. **Receive request:** Protected REST routes go through `authMiddleware`.
2. **Resolve identity:** The middleware calls Clerk's `getAuth(req)` (session cookie or Bearer token) rather than parsing headers by hand.
3. **Verify with Clerk:** `clerkMiddleware()` on the app plus `getAuth(req)` validates the session; `@clerk/backend` is not used directly.
4. **Attach user context:** On success, the middleware loads the MongoDB `User` by `clerkId` and sets `req.user`.
5. **Sync to DB:** No lazy sync — users are only created/updated by the Clerk webhook. A Clerk user missing from MongoDB gets a `404`.
6. **Reject if missing:** No `userId` on the request returns `401 Unauthorized`.

**Learning point:** The middleware acts as a gatekeeper—every protected route must pass through token verification before accessing resources.

### 3. Socket.IO Authentication (Planned)

> **Status:** not implemented. `backend/src/lib/socket.ts` currently reads `socket.handshake.query.userId` without verification. Tracked as the highest-priority item in [`BUGS.md`](../BUGS.md). The flow below is the target design.

WebSocket connections must also be authenticated (cannot rely solely on REST cookies in all cases).

1. **Client connects:** Socket.IO client connects to backend with auth token (e.g., `{ auth: { token } }` or via query/header).
2. **Server middleware (`io.use`)**: Intercept connection, extract and verify Clerk token.
3. **Allow/deny:** If valid, attach `clerkId`/user info to `socket.handshake.auth` or `socket.data`.
4. **Join user rooms:** After auth, join relevant rooms (e.g., user-specific room or conversation rooms).
5. **Disconnect on invalid:** Reject connection with error if token is invalid/expired.

This ensures only authenticated users can emit/listen to real-time events.

---

## User Sync Strategy

We need to keep MongoDB `User` documents in sync with Clerk user data. Two common approaches:

| Approach | Pros | Cons | When to use |
|---|---|---|---|
| **On-demand (lazy sync)** | Simple, no webhook setup needed initially. Works if user hits a protected endpoint. | User may not exist in DB until first API call; presence setup can be delayed. | Good for initial learning/simpler setup. |
| **Webhook-based (proactive)** | Reliable, syncs on create/update/delete regardless of app usage. Keeps data consistent. | Requires setting up Clerk webhook endpoint (ngrok/localtunnel for local dev). | Recommended for production-style behavior & better learning of webhooks. |

**Planned:** Start with **lazy sync** (in auth middleware: `findOneAndUpdate`/`findOrCreate` by `clerkId`) for simplicity, then add **Clerk webhooks** to properly handle `user.created`, `user.updated`, `user.deleted`. This matches the "webhooks explained" highlight.

---

## Webhooks (Clerk)

Webhooks allow Clerk to notify our backend when user lifecycle events occur. This is essential for maintaining consistency between Clerk and our DB.

### Events to Handle

Handled in `backend/src/webhooks/clerk.webhook.ts`:

| Event | When | Action |
|---|---|---|
| **`user.created`** | New user signs up via Clerk | Create a new MongoDB `User` document with `clerkId`, `email`, `username`, `avatar`, and default preferences. |
| **`user.updated`** | User updates profile in Clerk (name/email/avatar) | Update corresponding DB user fields (keep app-specific fields like `online`, `lastSeen`, `themePrefs` intact). |
| **`user.deleted`** | User is deleted in Clerk | Optionally soft-delete or remove the DB user. Consider impact on conversations/messages (data retention). For learning, handle gracefully (e.g., anonymize or prevent breaking refs). |

### Webhook Endpoint Structure

- **Route:** `POST /api/webhooks/clerk`
- **Purpose:** Receives raw JSON payload + `svix-signature` headers from Clerk.
- **Verification:** `verifyWebhook` from `@clerk/backend/webhooks` verifies the signature using `CLERK_WEBHOOK_SIGNING_SECRET`. Invalid signatures get `400`; an unset secret gets `503`.
- **Handler:** Parse event type and payload, perform DB operations.
- **Idempotency consideration:** Webhooks can be retried—design handlers to be safe if called multiple times (the handler upserts/deletes by `clerkId`).
- **Explain in code:** Add clear comments explaining what webhooks are, why we verify signatures, and the event flow.

See [`WEBHOOKS_CRON.md`](./WEBHOOKS_CRON.md) for a deeper conceptual explanation (security, testing with ngrok, localtunnel, etc.).

---

## Protected Routes

Protected routes require a valid Clerk token. All of these are implemented:

| Method | Route | Purpose | Notes |
|---|---|---|---|
| `GET` | `/api/auth/me` | Get current authenticated user (from MongoDB) | Uses auth middleware; `404` if not synced yet. |
| `GET` | `/api/messages/users` | List users for the sidebar | Requires auth. |
| `GET` | `/api/messages/conversations` | List chat partners | Requires auth. |
| `GET` | `/api/messages/:id` | Get 1:1 message history | Requires auth. |
| `POST` | `/api/messages/send/:id` | Send a text/media message | Requires auth; multipart field `media`. |

**Access control:** Message routes are scoped to the authenticated user's `_id`; the controller only reads/writes messages where the user is `senderId` or `receiverId`. Conversation endpoints are not implemented yet (conversations are derived from messages).

---

## Security Considerations (Learning Focus)

- **Token verification:** Always verify signatures, not just presence. Use Clerk's official libraries (`@clerk/backend`).
- **HTTPS in production:** Webhooks and tokens require secure transport.
- **Webhook signature verification:** Critical—never trust unverified webhook payloads.
- **CORS:** Restrict allowed origins to `FRONTEND_URL` only (the frontend origin).
- **Minimal exposure:** Keep secrets (`CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SIGNING_SECRET`) on backend only. Use `VITE_*` only for publishable key.
- **Token expiration:** Clerk tokens expire; clients must refresh. This is handled by Clerk SDK.
- **Socket auth on every connection:** Don't rely on "one-time" auth; verify on connect and consider re-auth if needed.

---

## Environment Variables

See [`ENV.md`](./ENV.md) for full list. Key auth-related vars:

- **Backend:** `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SIGNING_SECRET`, `FRONTEND_URL`
- **Frontend:** `VITE_CLERK_PUBLISHABLE_KEY` (`VITE_API_URL` is planned — no API client yet)

---

## Implementation Notes

- **Auth middleware:** `backend/src/middlewares/auth.middleware.ts` resolves `getAuth(req)`, loads the MongoDB `User` by `clerkId`, and sets the optional `req.user`.
- **Error handling:** Return appropriate status codes (401 for unauth, 403 for forbidden). See [`MIDDLEWARE.md`](./MIDDLEWARE.md) for error middleware.
- **TypeScript types:** `backend/src/types/express.d.ts` augments `Express.Request` with an **optional** `user`, so every handler must guard it.
- **Testing locally:** Use Clerk's test keys or development instance. For webhooks, use tools like [ngrok](https://ngrok.com/) or [localtunnel](https://theboroer.github.io/localtunnel-www/) to expose local server to Clerk.

---

## Related Documentation

- [`ENV.md`](./ENV.md) – Auth environment variables
- [`MIDDLEWARE.md`](./MIDDLEWARE.md) – Auth middleware deep-dive
- [`WEBHOOKS_CRON.md`](./WEBHOOKS_CRON.md) – Webhooks in detail
- [`SOCKETS.md`](./SOCKETS.md) – Socket.IO authentication
- [`API.md`](./API.md) – Protected endpoints
- [`DATABASE.md`](./DATABASE.md) – User model

---

*Last updated: reflects the implemented Clerk REST authentication, user sync, and webhook flow. Socket authentication is still planned (see [BUGS.md](../BUGS.md)).*