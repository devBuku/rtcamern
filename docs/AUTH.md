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

The backend verifies Clerk-issued tokens on protected REST routes and on Socket.IO connections. App-specific user data (online status, preferences, etc.) is stored in the MongoDB `User` model (see [`DATABASE.md`](./DATABASE.md)).

---

## Why Clerk?

- **Free tier available** – aligns with "100% Free Tools" requirement.
- **Frontend SDK + Backend SDK** – clean separation for React and Express.
- **JWT-based auth** – easy to verify on both REST and WebSocket layers.
- **Webhooks support** – enables reliable user sync even if users change data in Clerk.
- **Built-in UI** – speeds up auth UI so focus stays on chat/realtime features (great for learning).

---

## Authentication Flow

### 1. Frontend Authentication (Planned)

1. **Wrap app with ClerkProvider:** The React app will be wrapped with `ClerkProvider` using `VITE_CLERK_PUBLISHABLE_KEY`.
2. **Sign-in/Sign-up:** Use Clerk's pre-built components (`<SignIn />`, `<SignUp />`) or custom flows.
3. **Protected routes:** Wrap chat-related routes/pages with Clerk's `SignedIn`/`SignedOut` logic or a custom protected route component.
4. **Get auth token:** For API calls, use `getToken()` from `@clerk/clerk-react` to fetch the JWT and attach it to `Authorization: Bearer <token>`.
5. **Client-side user info:** Use `useUser()` to access authenticated user details from Clerk.

### 2. Backend Token Verification (Planned)

1. **Receive request:** Protected REST endpoint receives `Authorization: Bearer <token>`.
2. **Extract token:** Auth middleware extracts the token from headers.
3. **Verify with Clerk:** Using `@clerk/backend` (or `jsonwebtoken` with Clerk's JWKS), verify the token's signature and claims (issuer, audience, expiration).
4. **Attach user context:** If valid, extract `userId` (Clerk ID) and attach to `req.auth` or `req.user` for downstream handlers.
5. **Sync to DB (optional on access):** Find or create the corresponding MongoDB `User` document using `clerkId`. This keeps app state in sync.
6. **Reject if invalid:** Return `401 Unauthorized` for missing/invalid tokens.

**Learning point:** The middleware acts as a gatekeeper—every protected route must pass through token verification before accessing resources.

### 3. Socket.IO Authentication (Planned)

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

### Events to Handle (Planned)

| Event | When | Action |
|---|---|---|
| **`user.created`** | New user signs up via Clerk | Create a new MongoDB `User` document with `clerkId`, `email`, `username`, `avatar`, and default preferences. |
| **`user.updated`** | User updates profile in Clerk (name/email/avatar) | Update corresponding DB user fields (keep app-specific fields like `online`, `lastSeen`, `themePrefs` intact). |
| **`user.deleted`** | User is deleted in Clerk | Optionally soft-delete or remove the DB user. Consider impact on conversations/messages (data retention). For learning, handle gracefully (e.g., anonymize or prevent breaking refs). |

### Webhook Endpoint Structure (Planned)

- **Route:** `POST /api/webhooks/clerk` (or `/webhooks/clerk`)
- **Purpose:** Receives raw JSON payload + `svix-signature` headers from Clerk.
- **Verification:** Use `svix` library to verify the webhook signature using `CLERK_WEBHOOK_SECRET`. Reject with `401` if invalid.
- **Handler:** Parse event type and payload, perform DB operations.
- **Idempotency consideration:** Webhooks can be retried—design handlers to be safe if called multiple times (check existing records).
- **Explain in code:** Add clear comments explaining what webhooks are, why we verify signatures, and the event flow.

See [`WEBHOOKS_CRON.md`](./WEBHOOKS_CRON.md) for a deeper conceptual explanation (security, testing with ngrok, localtunnel, etc.).

---

## Protected Routes

Protected routes require a valid Clerk token. Examples of planned protected routes:

| Method | Route | Purpose | Notes |
|---|---|---|---|
| `GET` | `/api/auth/me` | Get current authenticated user (sync + return DB user) | Uses auth middleware. |
| `POST` | `/api/conversations` | Create/find a conversation | Requires auth. |
| `GET` | `/api/conversations` | Get all conversations for current user | Requires auth. |
| `GET` | `/api/messages/:conversationId` | Get messages for a conversation (paginated) | Requires auth + ensure user is participant. |
| `POST` | `/api/upload` | Upload media file | Requires auth. Uses upload middleware (Multer). |

**Access control:** Beyond auth, some routes need **authorization** (e.g., only participants can view messages in a conversation). This will be enforced in controllers/middleware as implemented.

---

## Security Considerations (Learning Focus)

- **Token verification:** Always verify signatures, not just presence. Use Clerk's official libraries (`@clerk/backend`).
- **HTTPS in production:** Webhooks and tokens require secure transport.
- **Webhook signature verification:** Critical—never trust unverified webhook payloads.
- **CORS:** Restrict allowed origins to `CLIENT_URL` only (frontend).
- **Minimal exposure:** Keep secrets (`CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`) on backend only. Use `VITE_*` only for publishable key.
- **Token expiration:** Clerk tokens expire; clients must refresh. This is handled by Clerk SDK.
- **Socket auth on every connection:** Don't rely on "one-time" auth; verify on connect and consider re-auth if needed.

---

## Environment Variables

See [`ENV.md`](./ENV.md) for full list. Key auth-related vars:

- **Backend:** `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`, `CLIENT_URL`
- **Frontend:** `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_API_URL`

---

## Implementation Notes

- **Auth middleware:** Create `auth.middleware.ts` (or `.js`) with clear comments explaining token extraction, verification, and attaching user context.
- **Error handling:** Return appropriate status codes (401 for unauth, 403 for forbidden). See [`MIDDLEWARE.md`](./MIDDLEWARE.md) for error middleware.
- **TypeScript types:** Augment Express Request type to include `auth`/`user` for type safety.
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

*Last updated: Initial auth design (Clerk + token verification + webhooks + sync strategy). Will evolve as implementation proceeds.*