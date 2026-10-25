# Middleware

This document explains the middleware layer in **rtcamern**. Middleware functions sit between the request and response cycle, handling cross-cutting concerns like authentication, error handling, and file uploads.

The goal is to understand *what* each middleware does, *why* it's needed, and *the order of execution*—all explained in a learning-focused way.

---

## Overview

In Express, middleware are functions that execute during the request-response lifecycle. Each middleware has access to `req`, `res`, and `next()`.

For this project, three core middleware are planned:

1. **Auth Middleware** – Verifies Clerk JWT tokens and attaches authenticated user context.
2. **Upload Middleware** – Handles multipart file uploads using Multer (from scratch implementation).
3. **Error Middleware** – Centralized error handling for consistent API responses.

---

## 1. Auth Middleware (Planned)

The auth middleware protects routes by ensuring only authenticated users can access them. It verifies the Clerk-issued JWT and attaches the authenticated user's identity to the request object.

### Purpose

- Prevent unauthenticated access to protected endpoints (conversations, messages, uploads, etc.).
- Extract and verify the Bearer token from the `Authorization` header.
- Attach `req.auth` (or `req.user`) containing `clerkId`, user info, etc. for downstream controllers.
- Optionally sync Clerk user to MongoDB `User` model (lazy sync) for app-specific data.

### Expected Location

`backend/src/middlewares/auth.middleware.ts` (TypeScript)

### Flow

1. **Extract token:** Read `Authorization: Bearer <token>` header. If missing, call `next()` with an `Unauthorized` error.
2. **Verify token:** Use `@clerk/backend` to verify the JWT (or validate via JWKS). Check signature, issuer, expiration.
3. **Attach context:** On success, attach `clerkId` and maybe `userId` to request (e.g., `req.auth = { clerkId: ... }`).
4. **Sync user (lazy):** Find or create MongoDB user by `clerkId`. Attach DB user to `req.user` if needed.
5. **Pass to next:** Call `next()` to continue to route handler.
6. **Handle errors:** On verification failure, pass `401 Unauthorized` to error middleware.

### Learning Points

- **Middleware order matters:** Auth middleware must run *before* route handlers that require authentication.
- **Type augmentation:** In TypeScript, extend `Express.Request` interface to include `auth`/`user` for type safety.
- **Separation:** Token verification is purely about "are you authenticated?"—authorization ("can you do this?") is often handled separately in controllers.
- **Reusable:** Applied via `router.use()` or per-route (e.g., `router.get('/conversations', auth, controller)`).

### Example Structure (Conceptual)

```ts
// Extract token, verify with Clerk, attach context, call next()
// On error, next(new UnauthorizedError())
```

*(Actual implementation will be hand-written. This is the intended structure.)*

---

## 2. Upload Middleware (Planned)

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
| **Memory Storage vs Disk Storage** | `multer.memoryStorage()` keeps files in RAM (good for uploading directly to ImageKit/cloud without writing to disk). `diskStorage()` saves to local filesystem (useful for temp storage, but needs cleanup). We'll choose and explain the rationale. |
| **File Filter** | Custom filter function checks `file.mimetype` (e.g., `image/jpeg`, `image/png`, `video/mp4`, `video/webm`) to allow only safe image/video types. Reject others with clear errors. |
| **Limits** | `limits.fileSize` (bytes) to prevent large uploads. Also can limit `files` count. Explain tradeoffs (UX vs server/resources). |
| **Single vs Multiple Files** | `upload.single('file')` for one file, `upload.array('files', N)` for multiple. Start simple (single upload) and explain. |
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

*(Implementation will reflect actual choices and include detailed comments.)*

---

## 3. Error Middleware

The error middleware is the **last** middleware in the stack. It catches errors thrown in route handlers, middleware, or controllers and returns consistent, structured error responses to the client.

### Purpose

- Centralized error handling (DRY principle).
- Return predictable JSON error responses: `{ success: false, message, statusCode, ... }`
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

The order in which middleware are registered is **extremely important** in Express. Here's the planned order for the backend app:

```text
1. Express JSON parser (express.json()) – Parse JSON bodies
2. CORS middleware – Handle cross-origin requests (configure CLIENT_URL)
3. Request logging (optional, for learning/debugging)
4. Routes
   ├─ Public routes (e.g., /health, /api/webhooks/clerk) – may skip auth
   └─ Protected routes – require Auth Middleware
      └─ Routes with file uploads – also use Upload Middleware
5. Error Middleware (last) – Catch all errors
```

### Example Registration Order (Conceptual)

```ts
app.use('/api/webhooks/clerk', express.raw({ type: 'application/json' }), webhookRouter); // before express.json()
app.use(express.json());
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(clerkMiddleware());
app.get('/health', ...);
app.use('/api/auth', authRouter);
app.use('/api/messages', messageRouter); // messageRouter applies authMiddleware
// ... SPA static serving + JSON 404
app.use(errorHandler); // must be last, 4 args
```

**Learning point:** Webhooks often require the **raw body** (not parsed JSON) for signature verification. We'll handle that carefully when implementing Clerk webhooks (separating webhook route from global `express.json()` if needed).

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

*Last updated: Initial middleware design. Implementation details will be added as code is written.*