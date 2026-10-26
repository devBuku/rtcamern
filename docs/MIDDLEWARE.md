# Middleware

This document explains the middleware layer in **rtcamern**. Middleware functions sit between the request and response cycle, handling cross-cutting concerns like authentication, error handling, and file uploads.

The goal is to understand *what* each middleware does, *why* it's needed, and *the order of execution*—all explained in a learning-focused way.

---

## Overview

In Express, middleware are functions that execute during the request-response lifecycle. Each middleware has access to `req`, `res`, and `next()`.

For this project, three core middleware are implemented:

1. **Auth Middleware** – Verifies Clerk JWT tokens and attaches authenticated user context.
2. **Upload Middleware** – Handles multipart file uploads using Multer (from scratch implementation).
3. **Error Middleware** – Centralized error handling for consistent API responses.

---

## 1. Auth Middleware

The auth middleware protects routes by ensuring only authenticated users can access them. It verifies the Clerk-issued JWT and attaches the authenticated user's identity to the request object.

### Purpose

- Prevent unauthenticated access to protected endpoints (conversations, messages, uploads, etc.).
- Resolve the Clerk identity from the request (`getAuth(req)`, e.g. session cookie or Bearer token).
- Attach `req.user` containing the MongoDB user for downstream controllers.
- Load the MongoDB `User` by `clerkId`; if not found, lazily sync the user from Clerk via `clerkClient.users.getUser()` and upsert into MongoDB.

### Expected Location

`backend/src/middlewares/auth.middleware.ts` (TypeScript)

### Flow

1. **Resolve identity:** Call `getAuth(req)`; Clerk's middleware has already validated the session cookie or Bearer token.
2. **Reject anonymous:** With no `userId`, respond `401 { message: "Unauthorized" }`.
3. **Load the app user:** `User.findOne({ clerkId: userId }).select("-__v")`.
4. **Lazy sync if missing:** If no document exists, call `clerkClient.users.getUser(userId)` and upsert the user into MongoDB using a `{ $or: [{ clerkId }, { email }] }` filter. This handles first-login-before-webhook and Clerk account re-creation scenarios.
5. **Reject unsynced users:** If both the DB lookup and Clerk API call fail, respond `404`.
6. **Attach context:** Set `req.user` to the MongoDB document.
7. **Pass to next:** Call `next()`; unexpected errors respond `500`.

### Learning Points

- **Middleware order matters:** Auth middleware must run *before* route handlers that require authentication.
- **Type augmentation:** In TypeScript, extend `Express.Request` interface to include `auth`/`user` for type safety.
- **Separation:** Token verification is purely about "are you authenticated?"—authorization ("can you do this?") is often handled separately in controllers.
- **Reusable:** Applied via `router.use()` or per-route (e.g., `router.get('/conversations', auth, controller)`).

### Example Structure (Conceptual)

```ts
// Resolve the Clerk identity, load the MongoDB user,
// attach it as req.user (optional), then call next()
```

### Current Behavior

The implementation matches the flow above (no custom error classes). It lazily syncs users from Clerk when they are not yet in MongoDB, then falls back to `404` only when the Clerk API call also fails. It is applied to every route via `router.use(authMiddleware)` in `backend/src/routes/auth.route.ts` and `backend/src/routes/message.route.ts`. Because `req.user` is typed optional, handlers must guard it.

---

## 2. Upload Middleware

The upload middleware handles multipart/form-data for file uploads. It's implemented using [Multer](https://github.com/expressjs/multer) from scratch—meaning we configure storage, validation, and limits ourselves to understand the internals.

### Purpose

- Parse incoming files from `multipart/form-data` requests.
- Implement **file uploads from scratch**: configure Multer's storage (memory vs disk), file filters, size limits, and MIME type checks.
- Validate files (accept only images/videos, enforce max size) before processing.
- Make uploaded file(s) available on `req.file` or `req.files` for downstream handlers (which then upload to ImageKit).
- Provide clear error messages for invalid uploads (wrong type, too large, etc.).

### Expected Location

`backend/src/middlewares/upload.middleware.ts` (TypeScript)

### Key Concepts to Explain in Code

| Concept | Explanation |
|---|---|
| **Memory Storage vs Disk Storage** | `multer.memoryStorage()` keeps files in RAM (good for uploading directly to ImageKit/cloud without writing to disk). `diskStorage()` saves to local filesystem (useful for temp storage, but needs cleanup). This project uses memory storage. |
| **File Filter** | Custom filter function checks `file.mimetype` (e.g., `image/jpeg`, `image/png`, `video/mp4`, `video/webm`) to allow only safe image/video types. Reject others with clear errors. |
| **Limits** | `limits.fileSize` (bytes) to prevent large uploads. Also can limit `files` count. Explain tradeoffs (UX vs server/resources). |
| **Single vs Multiple Files** | `upload.single('media')` for one file, `upload.array('files', N)` for multiple. This project accepts one media file per message. |
| **Error Handling** | Multer throws specific errors (`LIMIT_FILE_SIZE`, `LIMIT_UNEXPECTED_FILE`, etc.). These should be caught and passed to error middleware with user-friendly messages. |

### Learning Points

- **Why validate:** Never trust client file types/size. MIME checks + limits are essential for security and resource control.
- **Direct-to-cloud:** Using memory storage avoids temp files on disk—simpler and pairs well with ImageKit upload from buffer/stream.
- **Separation:** Upload middleware only parses/validates. Actual upload to ImageKit happens in the controller (business logic).
- **Explain "from scratch":** The implementation/config is hand-written to demonstrate how multipart parsing works conceptually with Multer.

### Example Structure (Conceptual)

```ts
import multer from "multer";

// Choose storage (explain choice)
const storage = multer.memoryStorage();

// File filter (explain allowed types)
const fileFilter = (req, file, cb) => { /* validate mimetype */ };

// Configure upload
const upload = multer({ storage, fileFilter, limits: { fileSize: ... } });

export const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_FILE_SIZE } });

// Routes call: upload.single("media")
```

### Current Behavior

`backend/src/middlewares/upload.middleware.ts` exports `upload` using `multer.memoryStorage()` with `MAX_FILE_SIZE` (25 MB) and an explicit image/video MIME allowlist in `fileFilter`. Rejected types attach `{ status: BAD_REQUEST }` so they surface as `400`. Routes call `upload.single("media")` (only `POST /api/messages/send/:id`). See [`MEDIA.md`](./MEDIA.md).

---

## 3. Error Middleware

The error middleware is the **last** middleware in the stack. It catches errors thrown in route handlers, middleware, or controllers and returns consistent, structured error responses to the client.

### Purpose

- Centralized error handling (DRY principle).
- Return predictable JSON error responses: `{ message }` (the catch-all 404 also adds `ok: false`).
- Distinguish between operational errors (expected, like "unauthorized") vs programming errors (bugs).
- Provide appropriate status codes and messages.
- Log errors in development for debugging (without leaking sensitive details in production).

### Expected Location

`backend/src/middlewares/error.middleware.ts` (TypeScript)

### Flow

1. **Error caught:** Any route/middleware does `next(err)` or throws an error.
2. **Error middleware receives:** Has signature `(err, req, res, next)` (4 args) which marks it as error-handling middleware in Express.
3. **Normalize error:** Check if it's a known custom error (with `statusCode`, `message`). If not, treat as 500 Internal Server Error.
4. **Send response:** Return JSON with `statusCode` and `message`. In development, can include stack trace; in production, omit stack.
5. **Log if needed:** Log unexpected errors for debugging.

### Current Behavior

`backend/src/middlewares/error.middleware.ts` implements a single `errorHandler` (4 args). It does not use custom error classes yet:

| Error | Status | Response |
|---|---|---|
| `multer.MulterError` with `LIMIT_FILE_SIZE` | `413` | `{ message: "File too large. Maximum size is 25MB." }` |
| Other `multer.MulterError` | `400` | `{ message: err.message }` |
| `Error` with a numeric `status` property (e.g. upload filter rejection) | that status | `{ message: err.message }` |
| Anything else | `500` | `{ message: "Internal Server Error" }` (logged server-side) |

The upload `fileFilter` attaches `{ status: BAD_REQUEST }` to its rejection error so it lands in the `400` branch. Custom error classes are still a possible future refactor.

### Learning Points

- **Always call `next(err)`:** Don't send response in every place—let centralized middleware handle it.
- **Order is critical:** Error middleware must be registered **after** all routes and other middleware.
- **Don't leak details:** In production, avoid exposing stack traces or internal error messages to clients.
- **Operational vs unexpected:** Distinguish expected errors (user errors, auth failures) from bugs (TypeError, ReferenceError).
- **Consistent API shape:** Frontend can rely on a uniform error structure for displaying messages.

### Example Structure (Conceptual)

```ts
export function errorHandler(err, _req, res, _next) {
  if (err instanceof multer.MulterError) {
    const status = err.code === "LIMIT_FILE_SIZE" ? PAYLOAD_TOO_LARGE : BAD_REQUEST;
    return res.status(status).json({ message: err.message });
  }
  if (err instanceof Error && typeof err.status === "number") {
    return res.status(err.status).json({ message: err.message });
  }
  console.error("Unhandled error:", err);
  res.status(INTERNAL_SERVER_ERROR).json({ message: "Internal Server Error" });
}
```

---

## Middleware Order (Execution Flow)

The order in which middleware are registered is **extremely important** in Express. This is the actual registration order in `backend/src/index.ts`:

```text
1. Clerk webhook with express.raw() – signature verification needs the raw body
2. express.json() – parse JSON bodies (after the webhook route)
3. CORS – allowed origin is FRONTEND_URL
4. clerkMiddleware() – attaches Clerk auth state to req
5. Routes
   ├─ Public: /health, /api/webhooks/clerk
   └─ Protected: /api/auth, /api/messages (router-level authMiddleware;
      message sends also run upload.single("media"))
6. SPA static serving + JSON 404 for unmatched /api/* paths
7. errorHandler (last) – maps Multer/status errors, catches everything else
```

### Registration Order

```ts
app.use('/api/webhooks/clerk', express.raw({ type: 'application/json' }), clerkWebhook); // before express.json()
app.use(express.json());
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(clerkMiddleware());
app.get('/health', ...);
app.use('/api/auth', authRouter);
app.use('/api/messages', messageRouter); // messageRouter applies authMiddleware
// ... SPA static serving + JSON 404
app.use(errorHandler); // must be last, 4 args
```

**Learning point:** Webhooks often require the **raw body** (not parsed JSON) for signature verification. The Clerk webhook is registered before `express.json()` for exactly that reason. A final 4-arg error handler is also required — without it Multer failures fall through to Express's default HTML 500 page.

---

## Best Practices (Learning-Focused)

- **Keep middleware focused:** Each does one job (auth, upload, error). Don't combine unrelated logic.
- **Explain in comments:** Add top-of-file comment: purpose, when it runs, order. Add inline comments for complex parts (token verification, file filter).
- **Don't over-comment trivial:** Focus on "why" (e.g., "verify signature to prevent spoofed webhooks", "memory storage chosen to upload directly to ImageKit").
- **Handle async errors:** In async route handlers, wrap with a wrapper or use `next(err)`. Express 5 has better async error handling, but still good to be explicit.
- **Validate early:** Upload validation in middleware catches bad files before hitting controllers—fail fast.
- **Consistent errors:** Always go through error middleware for user-facing errors.

---

## Related Documentation

- [`AUTH.md`](./AUTH.md) – Auth flow and token verification details
- [`MEDIA.md`](./MEDIA.md) – File uploads from scratch (Multer + ImageKit)
- [`API.md`](./API.md) – How middleware applies to endpoints
- [`WEBHOOKS_CRON.md`](./WEBHOOKS_CRON.md) – Webhook handling specifics
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) – Overall request flow

---

*Last updated: reflects the implemented auth, upload, and error middleware and the real registration order in `backend/src/index.ts`.*