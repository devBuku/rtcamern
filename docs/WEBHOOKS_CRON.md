# Webhooks & Cron Jobs

This document explains **Webhooks** and **Cron Jobs** in the context of **rtcamern**. Both are learning-focused topics mentioned in the highlights ("Webhooks, Cron Jobs & Middleware Explained").

---

## 1. Webhooks

### What are Webhooks?

A **webhook** is a way for an external service (like Clerk) to send real-time HTTP notifications to our backend when certain events happen, rather than us having to poll the API repeatedly. 

Think of it as "reverse API calls"—instead of our server asking "did anything change?", the external service tells us "something changed" by making a `POST` request to our endpoint.

### Why Use Webhooks?

- **Event-driven & real-time:** Get notified immediately when events occur (e.g., user signs up).
- **Efficient:** No need to constantly poll APIs to check for changes.
- **Reliable sync:** Keep our MongoDB in sync with Clerk's user data.
- **Decoupled:** External service doesn't need to know our internal logic except the endpoint URL.
- **Learning value:** Demonstrates how third-party integrations communicate with our app.

### Clerk Webhooks (Planned)

Clerk uses webhooks to notify our app about user lifecycle events. This helps maintain consistency between Clerk (auth source of truth) and our local `User` model (app-specific data like presence, preferences).

#### Events to Handle

| Event | Trigger | Purpose |
|---|---|---|
| **`user.created`** | New user registers via Clerk (sign-up) | Create MongoDB `User` document with `clerkId`, `email`, `username`, `avatar`, and default app preferences (themes, wallpaper, sounds). |
| **`user.updated`** | User changes profile in Clerk (name, email, avatar) | Update corresponding DB user. Preserve app-specific fields (`online`, `lastSeen`, `themePrefs`, `wallpaper`, `keyboardSound`). |
| **`user.deleted`** | User deleted from Clerk | Handle DB cleanup. Options: delete user document, or soft-delete/anonymize to preserve conversation/message integrity (important for chat history). For learning, document the chosen approach. |

#### Webhook Endpoint

**Route:** `POST /api/webhooks/clerk` (see [`API.md`](./API.md))

**Key requirements:**
- **Public endpoint:** Must be accessible without auth middleware (Clerk calls it directly).
- **Raw body:** Clerk signs requests using `svix`. Signature verification requires the **raw request body** (unparsed JSON). This means the global `express.json()` middleware must be skipped for this route.
- **Signature verification:** Use [svix](https://github.com/svix/svix-libs) to verify headers: `svix-id`, `svix-timestamp`, `svix-signature` against `CLERK_WEBHOOK_SECRET`. Reject with `401 Unauthorized` if verification fails.
- **Idempotent handling:** Webhooks may be retried by Clerk. Handlers should be safe if the same event is delivered multiple times (e.g., check if user with `clerkId` already exists).
- **Error handling:** Return appropriate status codes (200 for success, 400/401 for bad/unsigned requests).

#### Flow Diagram (Conceptual)

```text
Clerk (user.created)
  ↓ HTTP POST to /api/webhooks/clerk with svix headers + payload
Express route (receives raw body)
  ↓ verify signature using CLERK_WEBHOOK_SECRET
If valid: parse event type & data → perform DB operation (create/update/delete User)
  ↓ respond 200 OK
If invalid: respond 401 Unauthorized
```

#### Security Notes

- **Always verify signatures:** Never trust webhook payloads without verification. This prevents spoofing.
- **Use HTTPS in production:** Clerk requires secure endpoints.
- **Keep secret safe:** `CLERK_WEBHOOK_SECRET` is backend-only (see [`ENV.md`](./ENV.md)).
- **Log carefully:** Avoid logging full payloads with sensitive data in production.
- **Separate middleware:** Register webhook route **before** `express.json()` or use `express.raw({ type: 'application/json' })` specifically for this route.

#### Testing Locally

Since localhost isn't publicly accessible, use tunneling tools:
- **[ngrok](https://ngrok.com/)** – Expose local port: `ngrok http 3000`, get public URL like `https://abc.ngrok-free.app`
- **[localtunnel](https://theboroer.github.io/localtunnel-www/)** – Similar, open-source alternative: `lt --port 3000`

Then configure the webhook URL in Clerk Dashboard: `https://your-tunnel-url/api/webhooks/clerk` and add the events you want to listen for.

---

## 2. Cron Jobs

### What are Cron Jobs?

A **cron job** is a scheduled task that runs automatically at specified intervals (time-based). Cron uses a schedule expression (minute hour day-of-month month day-of-week) to define when tasks execute.

In Node.js, we use [node-cron](https://github.com/node-cron/node-cron) to schedule and run jobs on our backend server.

### Why Use Cron Jobs?

- **Automation:** Handle repetitive/background tasks without manual intervention.
- **Maintenance:** Keep the system clean (remove stale/orphaned data).
- **Learning value:** Demonstrates background processing and scheduled work.
- **Common in real apps:** Email reminders, data cleanup, report generation, etc.

### Planned Cron Jobs for rtcamern

Since this is a learning project, we'll implement **practical demo jobs** with clear explanations in code.

| Job | Schedule (Example) | Purpose | Notes |
|---|---|---|---|
| **Cleanup orphaned temp uploads** | `0 2 * * *` (daily at 2 AM) | Remove temporary/orphaned files if any were saved to disk (even if we primarily use memory storage, good to demonstrate). | If using memory storage only, this may be minimal. Explain disk vs memory and why cleanup matters. |
| **Mark inactive users** | `0 0 * * *` (daily at midnight) | Identify users who haven't been seen recently (e.g., `lastSeen` > X days ago) and optionally mark as "inactive" for analytics/UI. Doesn't delete users. | Purely demonstrative; respects data retention. |
| **Cleanup old read receipts context** (optional) | Weekly | Demo of less frequent job. Can be skipped if not needed. | Focus on first job as primary demo. |

**Focus:** The main learning demo is likely **orphaned temp file cleanup**—ties directly to "file uploads from scratch" (disk storage scenario).

### Cron Job Implementation (Planned)

**Location:** `backend/src/cron/` directory

Suggested structure:
```text
backend/src/cron/
├── index.ts        # Register and start all cron jobs
├── cleanupTemp.ts  # Orphaned temp file cleanup
└── inactiveUsers.ts # Mark inactive users (demo)
```

### Example: Cleanup Temp Files (Conceptual)

If we ever use `multer.diskStorage()` (or save previews), temp files might accumulate. With `memoryStorage` it's less common, but demonstrating is valuable.

```ts
import cron from "node-cron";
import fs from "fs/promises";
import path from "path";

// Run daily at 2 AM
cron.schedule("0 2 * * *", async () => {
  console.log("[CRON] Starting temp file cleanup...");
  const tempDir = path.join(__dirname, "../../uploads/temp");
  try {
    // List files older than 24 hours
    const files = await fs.readdir(tempDir);
    // Check age and delete old files
    // ...
    console.log(`[CRON] Cleanup complete. Removed N files.`);
  } catch (err) {
    console.error("[CRON] Cleanup failed:", err);
  }
});
```

**Learning points:**
- Explain cron syntax: `0 2 * * *` = minute 0, hour 2, every day/month/weekday.
- Jobs should be **idempotent** and **fail-safe** (errors don't crash server).
- Add logging to see when jobs run (useful for learning).
- Don't block the event loop—use async/await properly.
- Only start jobs in non-test environments (`NODE_ENV !== 'test'`) if desired.

### Starting Cron Jobs

Cron jobs should start when the server boots. Register them in `backend/src/index.ts` or in `backend/src/cron/index.ts` after DB connection is established.

```ts
// index.ts (conceptual)
import connectDB from "./lib/db";
import "./cron"; // imports and starts cron jobs
```

Or explicitly:
```ts
// cron/index.ts
import "./cleanupTemp";
import "./inactiveUsers";
console.log("[CRON] Jobs registered");
```

---

## 3. Webhooks vs Cron Jobs: Key Differences

| Aspect | Webhooks | Cron Jobs |
|---|---|---|
| **Trigger** | Event-driven (external service calls our endpoint) | Time-driven (runs on schedule) |
| **When** | Immediately when event happens | At fixed intervals (minute/hour/day) |
| **Direction** | Inbound HTTP POST from external service | Outbound/internal scheduled execution |
| **Use case** | User sync from Clerk, payment notifications | Cleanup, reports, reminders |
| **Latency** | Near real-time | Depends on schedule |
| **Setup** | Need public endpoint + signature verification | Need scheduler on server |

**Both are important concepts**—webhooks react to external events; cron jobs maintain internal state over time.

---

## 4. Implementation Checklist

### Webhooks
- [ ] Add `CLERK_WEBHOOK_SECRET` to `.env.example` and constants
- [ ] Install `svix` package (`yarn add svix`)
- [ ] Create webhook route/controller (`webhooks/clerk.controller.ts`)
- [ ] Handle raw body for signature verification (middleware setup)
- [ ] Verify svix signature
- [ ] Handle `user.created`, `user.updated`, `user.deleted` events
- [ ] Sync to MongoDB `User` model
- [ ] Add detailed comments explaining webhooks, signature verification, idempotency
- [ ] Register route in `index.ts` before `express.json()` for raw body handling

### Cron Jobs
- [ ] Install `node-cron` (`yarn add node-cron`) and types (`@types/node-cron`)
- [ ] Create `backend/src/cron/` directory
- [ ] Implement `cleanupTemp.ts` with explanatory comments (cron syntax, logic)
- [ ] Implement `inactiveUsers.ts` as demo (optional but good)
- [ ] Create `cron/index.ts` to register jobs
- [ ] Import/start cron jobs in `index.ts` after DB connection
- [ ] Add logging for visibility
- [ ] Make jobs fail-safe (try-catch)

---

## 5. Learning Notes to Document in Code

- **Webhooks:** Explain "why not poll?" and signature verification purpose (prevent forged requests).
- **svix:** Briefly explain it's Clerk's recommended way to verify webhook signatures.
- **Raw body:** Explain why we need it (HMAC verification uses the exact raw bytes).
- **Cron syntax:** Comment each part of cron expression (`* * * * *`).
- **Idempotency:** Explain why webhook handlers must handle duplicates.
- **Fail-safe:** Cron jobs shouldn't crash the app on error.
- **Separation:** Keep webhook/cron logic in dedicated folders (separates concerns).

---

## Related Documentation

- [`AUTH.md`](./AUTH.md) – Clerk auth and webhook integration details
- [`MIDDLEWARE.md`](./MIDDLEWARE.md) – Middleware order (raw body vs JSON)
- [`API.md`](./API.md) – Webhook endpoint contract
- [`DATABASE.md`](./DATABASE.md) – User model for sync
- [`MEDIA.md`](./MEDIA.md) – Ties to temp file cleanup
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) – Webhooks/cron in system

---

*Last updated: Initial webhooks & cron jobs design with learning focus. Implementation will add concrete code with detailed explanations.*