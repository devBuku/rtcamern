# API Reference

This document will serve as the REST API reference for **rtcamern**. It lists all endpoints, HTTP methods, auth requirements, request/response examples, and purpose.

As endpoints are implemented (auth, conversations, messages, uploads, webhooks), they'll be documented here with clarity and learning notes.

---

## Base URL

- **Development:** `http://localhost:3000`
- **Production:** `<backend-deployed-url>` (e.g., Railway/Render)

All API routes are prefixed under `/api` unless stated otherwise (e.g., `/health`, `/api/webhooks/clerk`).

---

## Authentication

Most endpoints require authentication via Clerk JWT. Send the token in the `Authorization` header:

```http
Authorization: Bearer <clerk-jwt-token>
```

Protected routes use the **Auth Middleware** (see [`MIDDLEWARE.md`](./MIDDLEWARE.md)). Requests without a valid token return `401 Unauthorized`.

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
  "message": "I am healthy"
}
```
(Status code uses `OK` from `backend/src/constants/http-status.ts`.)

---

### 2. Auth (Planned)

| Method | Route | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/auth/me` | Required | Returns the current authenticated user's DB profile (synced from Clerk). Creates user if not exists (lazy sync). |

#### Response (200 OK)

```json
{
  "success": true,
  "user": {
    "_id": "...",
    "clerkId": "...",
    "email": "...",
    "username": "...",
    "avatar": "...",
    "online": false,
    "lastSeen": "2026-10-12T...",
    "themePrefs": { "theme": "light", "mode": "light" },
    "wallpaper": null,
    "keyboardSound": false,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

#### Notes
- Uses Auth Middleware to verify token.
- Syncs with DB if user doesn't exist yet.
- See [`AUTH.md`](./AUTH.md) for full auth flow.

---

### 3. Conversations (Planned)

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

### 4. Messages (Planned)

| Method | Route | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/messages/:conversationId` | Required | Fetch messages for a conversation with pagination (oldest→newest or newest→oldest). Must be participant. |
| `POST` | `/api/messages` | Required | Create/send a message (text and/or media). Message is persisted and also emitted via Socket.IO to room. |

#### GET `/api/messages/:conversationId` – Query Params

| Param | Type | Required | Default | Notes |
|---|---|---|---|---|
| `page` | `number` | No | `1` | Page number for pagination. |
| `limit` | `number` | No | `20` | Messages per page. Use cursor-based or skip/limit for infinite scroll. |

#### GET Response (200 OK)

```json
{
  "success": true,
  "messages": [
    {
      "_id": "...",
      "conversationId": "...",
      "sender": { "_id": "...", "clerkId": "...", "username": "...", "avatar": "..." },
      "text": "Hello!",
      "media": [],
      "readBy": [],
      "deliveredAt": "...",
      "createdAt": "..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "hasNext": true
  }
}
```

#### POST `/api/messages` – Request

```json
{
  "conversationId": "...",
  "text": "Hey, check this out!",
  "media": [
    {
      "url": "https://ik.imagekit.io/...",
      "type": "image",
      "thumbnailUrl": "...",
      "fileId": "...",
      "key": "...",
      "size": 12345,
      "mimeType": "image/jpeg"
    }
  ]
}
```

#### POST Response (201 Created)

```json
{
  "success": true,
  "message": { /* same as above */ }
}
```

#### Notes
- At least one of `text` or `media` should be present (validation).
- Sender is inferred from authenticated user (via Auth Middleware).
- After persistence, the Socket.IO server broadcasts the message to all participants in the conversation room.
- See [`SOCKETS.md`](./SOCKETS.md) for real-time event details.

---

### 5. Media Upload (Planned)

| Method | Route | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/upload` | Required | Upload image/video file from scratch using Multer. File is validated, then uploaded to ImageKit. Returns media metadata for use in messages. |

#### Request
- `Content-Type: multipart/form-data`
- Field name: `media` (or `file`) – single file upload

Example (curl):

```bash
curl -X POST http://localhost:3000/api/upload \
  -H "Authorization: Bearer <token>" \
  -F "media=@/path/to/image.jpg"
```

#### Response (200 OK)

```json
{
  "success": true,
  "media": {
    "url": "https://ik.imagekit.io/your_id/filename.jpg",
    "thumbnailUrl": "https://ik.imagekit.io/your_id/tr:w-300,h-300/filename.jpg",
    "type": "image",
    "fileId": "file_xxx",
    "key": "filename.jpg",
    "size": 245632,
    "mimeType": "image/jpeg"
  }
}
```

#### Notes
- Uses **Upload Middleware** (Multer) for parsing/validation (file type, size limits). See [`MIDDLEWARE.md`](./MIDDLEWARE.md).
- Uploads to **ImageKit** via SDK/server-side upload. See [`MEDIA.md`](./MEDIA.md) for full explanation of "file uploads from scratch" + ImageKit.
- Returns metadata ready to embed in Message.media array.
- Allowed types: images (jpg, jpeg, png, webp, gif) and videos (mp4, webm, mov) – final allowlist to be confirmed in implementation.

---

### 6. Webhooks (Planned)

| Method | Route | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/webhooks/clerk` | Public | Clerk webhook endpoint for user lifecycle events (user.created, user.updated, user.deleted). |
| `POST` | `/api/webhooks/*` | Public | Other webhooks if added later (placeholder). |

#### Important Notes
- **Public**: No auth middleware (Clerk calls this directly).
- **Signature verification required:** Must verify `svix` signature headers (`svix-id`, `svix-timestamp`, `svix-signature`) using `CLERK_WEBHOOK_SIGNING_SECRET`. Reject invalid requests with 401.
- **Raw body needed:** For signature verification, the route must receive raw body, not JSON-parsed body. This affects middleware order (separate from global `express.json()`).
- **Idempotent:** Handle retries safely (check if user already exists/updated).
- **See:** [`AUTH.md`](./AUTH.md) and [`WEBHOOKS_CRON.md`](./WEBHOOKS_CRON.md) for full webhook flow and security.

---

## Error Responses

All errors (except maybe some edge cases) go through the centralized **Error Middleware** and follow a consistent structure.

### Standard Error Format

```json
{
  "success": false,
  "message": "Human-readable error message",
  "statusCode": 400
}
```

In development, additional fields may be included (e.g., `stack`) for debugging.

### Common Status Codes

| Code | Meaning | When |
|---|---|---|
| `400` | Bad Request | Invalid request body/params (missing fields, bad format). |
| `401` | Unauthorized | Missing or invalid auth token. |
| `403` | Forbidden | Authenticated but not authorized to access resource (e.g., not a participant). |
| `404` | Not Found | Resource doesn't exist (conversation, message, user). |
| `422` | Unprocessable Entity | Validation failed (file type/size, schema validation). |
| `429` | Too Many Requests | Rate limiting (if added later). |
| `500` | Internal Server Error | Unexpected server error. |

---

## Request/Response Conventions

- **JSON for API:** All API requests/responses use `application/json` except file uploads (`multipart/form-data`).
- **Success wrapper:** Responses use `{ success: true, ...data }` for consistency.
- **Timestamps:** Use ISO 8601 format (`YYYY-MM-DDTHH:mm:ss.sssZ`).
- **IDs:** MongoDB ObjectIds as strings.
- **Populated refs:** When returning nested user/conversation/message data, populated fields include minimal user info (`_id`, `clerkId`, `username`, `avatar`) to avoid leaking unnecessary data.
- **Pagination:** For list endpoints (messages, conversations), include pagination metadata.

---

## Notes on Evolution

- **Socket.IO events** are documented separately in [`SOCKETS.md`](./SOCKETS.md). The REST API and Socket.IO work together (e.g., POST message persists via REST or socket—implementation choice will be clarified; typically messages are sent via socket for real-time, but REST may exist for history/uploads flow).
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

*Last updated: Initial API structure with planned endpoints. Will be updated as routes/controllers are implemented.*