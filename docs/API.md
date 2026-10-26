# API Reference

This document is the REST API reference for **rtcamern**. It lists endpoints, HTTP methods, auth requirements, request/response examples, and purpose.

Endpoints are documented as they are implemented; anything still only designed is labeled as such.

---

## Base URL

- **Development:** `http://localhost:3000`
- **Production:** your deployed app URL (e.g., `https://rtcamern.onrender.com`) — the API and SPA share one origin

All API routes are prefixed under `/api` unless stated otherwise (e.g., `/health`, `/api/webhooks/clerk`).

---

## Authentication

Most endpoints require a Clerk session. `authMiddleware` calls `getAuth(req)`, which resolves either the Clerk session cookie or an `Authorization: Bearer <token>` header, so sending the request with credentials is sufficient:

```http
Authorization: Bearer <clerk-jwt-token>
```

Protected routes use the **Auth Middleware** (see [`MIDDLEWARE.md`](./MIDDLEWARE.md)). Requests without a valid session return `401 Unauthorized`; a signed-in Clerk user missing from MongoDB returns `404`.

Some routes (like health check and webhooks) are public and do not require auth.

---

## Endpoints

### 1. Health Check

| Method | Route | Auth | Purpose |
|---|---|---|---|
| `GET` | `/health` | Public | Simple health check to verify server is running. |

#### Response (200 OK)

```json
{
  "ok": true
}
```
(Status code uses `OK` from `backend/src/constants/http-status.ts`.)

---

### 2. Auth

| Method | Route | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/auth/me` | Required | Returns the authenticated user's MongoDB profile (synced from Clerk via webhook). |

#### Response (200 OK)

```json
{
  "success": true,
  "user": {
    "_id": "...",
    "clerkId": "...",
    "email": "...",
    "fullName": "...",
    "profilePic": "...",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

#### Notes
- Uses Auth Middleware to verify the Clerk token and load the user by `clerkId`.
- Sync uses a **dual strategy**: the auth middleware lazily syncs users from Clerk via `clerkClient.users.getUser()` on first access; the Clerk webhook (`user.created` / `user.updated` / `user.deleted`) keeps the profile up to date proactively. Both paths upsert using `{ $or: [{ clerkId }, { email }] }` to handle account re-creation gracefully. A `404` with `{ "message": "User profile is not synced yet" }` now only occurs if the Clerk API call also fails.
- See [`AUTH.md`](./AUTH.md) for full auth flow.

---

### 3. Conversations (Not Implemented)

> The app currently derives sidebar conversations directly from the `Message` collection (see `GET /api/messages/conversations`). There is no `Conversation` model or `/api/conversations` route yet; the contract below is a design target, not current behavior.

| Method | Route | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/conversations` | Required | Create or find an existing 1:1 conversation between current user and another user. |
| `GET` | `/api/conversations` | Required | Get all conversations for the current authenticated user, sorted by recency (`lastMessageAt`). Populates participants & lastMessage. |
| `GET` | `/api/conversations/:id` | Required | Get a specific conversation by ID. Must be a participant. |

#### POST `/api/conversations` – Request

```json
{
  "participantId": "clerkId_or_userId_of_other_user"
}
```

#### POST `/api/conversations` – Response (200/201)

```json
{
  "success": true,
  "conversation": {
    "_id": "...",
    "participants": [{ "_id": "...", "clerkId": "...", "username": "...", "avatar": "..." }, "..."],
    "lastMessage": null,
    "lastMessageAt": null,
    "unreadCounts": {},
    "isGroup": false,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

#### Notes
- For 1:1, prevent creating duplicate conversations between same two users.
- Only authenticated users can create/access conversations.
- Authorization: users can only view conversations they participate in.

---

### 4. Messages

All routes are mounted under `/api/messages` and require auth (the router applies `authMiddleware`).

| Method | Route | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/messages/users` | Required | List all users except the current one (for the sidebar). Omits `clerkId`. |
| `GET` | `/api/messages/conversations` | Required | List chat partners derived from messages, most recent first. |
| `GET` | `/api/messages/:id` | Required | Fetch the message history between the current user and user `:id`, oldest first. |
| `POST` | `/api/messages/send/:id` | Required | Send a text and/or media message to user `:id`. |

#### GET `/api/messages/users` – Response (200 OK)

```json
[
  {
    "_id": "...",
    "email": "...",
    "fullName": "...",
    "profilePic": "...",
    "createdAt": "...",
    "updatedAt": "..."
  }
]
```

#### GET `/api/messages/conversations` – Response (200 OK)

One user object per chat partner, sorted by latest message time. Partners whose user record was deleted are omitted.

```json
[
  {
    "_id": "...",
    "email": "...",
    "fullName": "...",
    "profilePic": "...",
    "createdAt": "...",
    "updatedAt": "..."
  }
]
```

#### GET `/api/messages/:id` – Response (200 OK)

```json
[
  {
    "_id": "...",
    "senderId": "...",
    "receiverId": "...",
    "text": "Hello!",
    "image": null,
    "video": null,
    "createdAt": "...",
    "updatedAt": "..."
  }
]
```

Returns `400 { "message": "Invalid user id" }` when `:id` is not a valid ObjectId.

#### POST `/api/messages/send/:id` – Request

`Content-Type: multipart/form-data`

| Field | Type | Required | Notes |
|---|---|---|---|
| `text` | `string` | Conditional | Required if no `media` file is sent. |
| `media` | `file` | Conditional | Single image/video. Required if `text` is empty. |

Example:

```bash
curl -X POST http://localhost:3000/api/messages/send/<userId> \
  -H "Authorization: Bearer <token>" \
  -F "text=Hey, check this out!" \
  -F "media=@/path/to/image.jpg"
```

#### POST Response (201 Created)

```json
{
  "_id": "...",
  "senderId": "...",
  "receiverId": "...",
  "text": "Hey, check this out!",
  "image": "https://ik.imagekit.io/.../chat-...-image.jpg",
  "video": null,
  "createdAt": "...",
  "updatedAt": "..."
}
```

#### Notes
- At least one of `text` or `media` is required; otherwise `400`.
- An invalid `:id` returns `400`.
- Upload limits: 25 MB (`MAX_FILE_SIZE`) and an explicit image/video MIME allowlist. Oversized files return `413`; unsupported types return `400`.
- Images are stored in `image`; videos in `video`.
- `sendMessage` emits a `newMessage` Socket.IO event to the receiver when they have an active socket. The socket handshake is **not authenticated** yet — see [`BUGS.md`](../BUGS.md).

---

### 5. Media Upload (Not Implemented as a Standalone Route)

There is no `POST /api/upload` route yet. Media is uploaded as part of `POST /api/messages/send/:id` using the `media` field: the controller sends the in-memory buffer to ImageKit and stores the returned URL on the message.

#### Notes
- Uses `backend/src/middlewares/upload.middleware.ts` (Multer memory storage) for parsing and validation. See [`MEDIA.md`](./MEDIA.md).
- Uploads to ImageKit via `backend/src/lib/imagekit.ts`.
- Allowed types: `image/jpeg`, `image/jpg`, `image/png`, `image/webp`, `image/gif`, `image/avif`, `video/mp4`, `video/webm`, `video/quicktime`, `video/ogg`.
- Max size: 25 MB (`MAX_FILE_SIZE` in `backend/src/constants/env.ts`).
- The response is the created message document (see section 4), not a standalone media object.

---

### 6. Webhooks

| Method | Route | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/webhooks/clerk` | Public | Clerk webhook endpoint for user lifecycle events (user.created, user.updated, user.deleted). |
| `POST` | `/api/webhooks/*` | Public | Other webhooks if added later (placeholder). |

#### Important Notes
- **Public**: No auth middleware (Clerk calls this directly).
- **Signature verification required:** Must verify `svix` signature headers (`svix-id`, `svix-timestamp`, `svix-signature`) using `CLERK_WEBHOOK_SIGNING_SECRET`. Invalid signatures return `400`; an unset secret returns `503`.
- **Raw body needed:** For signature verification, the route must receive raw body, not JSON-parsed body. This affects middleware order (separate from global `express.json()`).
- **Idempotent:** Handle retries safely (check if user already exists/updated).
- **See:** [`AUTH.md`](./AUTH.md) and [`WEBHOOKS_CRON.md`](./WEBHOOKS_CRON.md) for full webhook flow and security.

---

## Error Responses

Controller errors and the centralized error middleware return a JSON object with a `message` field:

```json
{
  "message": "Human-readable error message"
}
```

The catch-all 404 also includes `"ok": false`. There is no `success`/`statusCode` wrapper in error bodies yet.

### Common Status Codes

| Code | Meaning | When |
|---|---|---|
| `400` | Bad Request | Invalid `:id`, missing text/media, or unsupported file type. |
| `401` | Unauthorized | Missing or invalid auth token. |
| `404` | Not Found | Unknown route, or Clerk user not synced to MongoDB yet. |
| `413` | Payload Too Large | Upload exceeds `MAX_FILE_SIZE` (25 MB). |
| `500` | Internal Server Error | Unexpected server error. |
| `503` | Service Unavailable | Clerk webhook secret is not configured. |

---

## Request/Response Conventions

- **JSON for API:** All API requests/responses use `application/json` except file uploads (`multipart/form-data`).
- **Success shapes are not uniform yet:** `/api/auth/me` returns `{ success: true, user }`; `/health` returns `{ ok: true }`; message endpoints return the array or document directly.
- **Timestamps:** ISO 8601 format (`YYYY-MM-DDTHH:mm:ss.sssZ`).
- **IDs:** MongoDB ObjectIds as strings.
- **User data:** message/user endpoints omit `clerkId`; user objects expose `_id`, `email`, `fullName`, `profilePic`, and timestamps.
- **Pagination:** Not implemented yet; `GET /api/messages/:id` returns the full history.

---

## Notes on Evolution

- **Socket.IO events** are documented separately in [`SOCKETS.md`](./SOCKETS.md). Messages are sent and persisted through REST (`POST /api/messages/send/:id`), and the controller then emits `newMessage` over Socket.IO to the receiver if they are online. The fuller event contract in `SOCKETS.md` is still the target design — the current implementation is partial (see [`BUGS.md`](../BUGS.md)).
- **Auth token refresh:** Handled by Clerk SDK on client; backend just verifies tokens.
- **Rate limiting & security headers:** May be added later (helmet, express-rate-limit) as learning extras.
- **Group chats:** If implemented, conversation endpoints will be extended to support `isGroup`, adding/removing members.

---

## Related Documentation

- [`MIDDLEWARE.md`](./MIDDLEWARE.md) – Auth, upload, error middleware
- [`AUTH.md`](./AUTH.md) – Authentication flow
- [`SOCKETS.md`](./SOCKETS.md) – Real-time events
- [`MEDIA.md`](./MEDIA.md) – Upload flow
- [`DATABASE.md`](./DATABASE.md) – Models referenced
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) – API layer in context

---

*Last updated: reflects the implemented auth, messages, and Clerk webhook routes; real-time delivery over Socket.IO is partial (see [BUGS.md](../BUGS.md)).*