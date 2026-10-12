# Socket.IO Real-Time Events

This document explains the custom **Socket.IO** WebSocket server for **rtcamern**. It covers connection/authentication, rooms, event names, payloads, presence, typing indicators, read receipts, and the "custom WebSocket server" learning aspect.

The goal is to understand how real-time communication works from scratch (no Firebase/Supabase) and how events flow between client and server.

---

## Overview

Real-time features are powered by [Socket.IO](https://socket.io/), running on the same Express server as the REST API. This allows sharing auth logic and easy broadcasting to conversation rooms.

Key real-time features:
- **Instant messaging** – Send/receive messages in real-time
- **Online presence** – Track which users are online/offline
- **Typing indicators** – Show when someone is typing
- **Read receipts** – Track message read status
- **Conversation rooms** – Targeted broadcasting to participants only

---

## Custom WebSocket Server (Learning Point)

A "custom WebSocket server" means we're implementing Socket.IO ourselves from scratch on our own Node/Express server, rather than using a third-party realtime BaaS (Firebase Realtime DB, Supabase Realtime, Pusher, Ably, etc.).

**Why build custom?**
- Understand how WebSockets work at a higher level (handshakes, rooms, namespaces, events).
- Learn socket authentication (verifying tokens on connect).
- Control room logic, presence tracking, and event contracts.
- See how REST + WebSocket layers interact in the same app.
- Aligns with "Build Your Own WebSocket Server" highlight.

The Socket.IO server will be initialized in the backend (e.g., `backend/src/socket/socket.server.ts` or integrated into `index.ts`), attached to the HTTP server.

---

## Connection & Authentication

All socket connections must be authenticated using Clerk identity. Unauthenticated connections are rejected.

### Client Connection (Planned)

```ts
// Frontend (conceptual)
import { io } from "socket.io-client";
const socket = io(VITE_SOCKET_URL, {
  auth: {
    token: await getClerkToken() // Clerk JWT
  }
});
```

### Server-Side Auth (Planned)

Using `io.use()` middleware to authenticate before allowing connection:

1. **Extract token** from `socket.handshake.auth.token` (or headers/query).
2. **Verify token** with Clerk (same verification logic as REST auth middleware).
3. **On success:** Attach `clerkId` and userId to `socket.data` (e.g., `socket.data.clerkId = ...`, `socket.data.userId = ...`).
4. **Call `next()`** to allow connection.
5. **On failure:** Call `next(new Error('Unauthorized'))` to reject connection.

**Learning point:** Socket auth happens at the handshake phase—before any events are exchanged.

---

## Presence Tracking (Online Users)

Presence is tracked to show "online" indicators and "last seen" timestamps.

### Data Structure (In-Memory, Planned)

For learning, presence is tracked in-memory using a Map for simplicity:

```ts
// Map<clerkId or userId, Set<socketId>>
const onlineUsers = new Map();

// Or Map<userId, { socketIds: Set<string>, lastSeen?: Date }>
```

Reasons for in-memory:
- Simple and easy to understand for learning.
- Fast lookups for "is user online?" checks.
- For production, could use Redis for multi-instance scaling—but out of scope for this learning project.

### Events

#### `user:online` (Server → Clients)
Broadcast to relevant clients when a user comes online (first active socket). Payload:

```json
{
  "userId": "...",
  "online": true
}
```

#### `user:offline` (Server → Clients)
Broadcast when a user has no active sockets (fully disconnected). Payload:

```json
{
  "userId": "...",
  "online": false,
  "lastSeen": "2026-10-12T..."
}
```

### Handlers

- **`connection`**: On connect, mark user as online, add socketId to map, broadcast `user:online` to others (or to relevant users like conversation participants).
- **`disconnect`**: On disconnect, remove socketId. If no sockets remain for user, update DB `User.online=false`, set `lastSeen=now`, broadcast `user:offline`.

**DB sync:** Also update MongoDB `User` model (`online`, `lastSeen`) on connect/disconnect to keep persistent state.

---

## Rooms

Rooms are used for **targeted broadcasting**—only participants in a conversation receive that conversation's messages/typing events.

### Room Naming Convention

Use conversation ID as room name to keep it simple and unique:

```text
room: conversation:<conversationId>
```

Or just `<conversationId>`. Using a prefix is clearer for debugging.

### Joining/Leaving

#### Client → Server: `conversation:join`

Request to join a conversation room. Server validates the user is a participant of that conversation.

**Payload:**

```json
{
  "conversationId": "..."
}
```

**Server logic:**
1. Verify user is participant in Conversation (DB check).
2. If yes, `socket.join(conversationId)`.
3. Optionally emit `conversation:joined` back to client for confirmation.

#### Client → Server: `conversation:leave`

Leave a conversation room (when switching chats, closing, etc.).

**Payload:**

```json
{
  "conversationId": "..."
}
```

**Server logic:** `socket.leave(conversationId)`

**Learning point:** Joining by conversationId ensures we don't broadcast messages to unrelated users. Authorization check is critical—only participants allowed.

---

## Messaging Events

### Send Message

#### Client → Server: `message:send`

Send a new message in a conversation.

**Payload:**

```json
{
  "conversationId": "...",
  "text": "Hello there!",
  "media": [
    { "url": "...", "type": "image", "thumbnailUrl": "...", "fileId": "...", "key": "...", "size": 12345, "mimeType": "image/jpeg" }
  ]
}
```

**Server logic:**
1. Verify user is authenticated (socket.auth) and participant of conversation.
2. Validate payload: at least `text` or `media` present.
3. Persist message to MongoDB (`Message` model) with `sender = socket.data.userId`, `conversationId`, `text`, `media`.
4. Update Conversation: set `lastMessage = message._id`, `lastMessageAt = now`, increment `unreadCounts` for other participants.
5. **Broadcast** to room: `conversation:<conversationId>` emit `message:receive`.

#### Server → Clients: `message:receive`

Broadcast received message to all participants in the conversation room (including sender, depending on UX; usually sender also receives to confirm).

**Payload:**

```json
{
  "_id": "...",
  "conversationId": "...",
  "sender": { "_id": "...", "clerkId": "...", "username": "...", "avatar": "..." },
  "text": "Hello there!",
  "media": [...],
  "readBy": [],
  "deliveredAt": "...",
  "createdAt": "..."
}
```

**Notes:**
- Message is populated with sender info for easy rendering.
- This is the core real-time event for instant messaging.

---

## Typing Indicators

Typing is **ephemeral**—not persisted to database. Broadcasted live to show others "X is typing...".

### Start Typing

#### Client → Server: `typing:start`

User started typing in a conversation.

**Payload:**

```json
{
  "conversationId": "..."
}
```

**Server logic:**
1. Verify participant.
2. Broadcast to others in room (exclude sender): `typing:show`

#### Server → Clients (others): `typing:show`

**Payload:**

```json
{
  "conversationId": "...",
  "userId": "...",
  "username": "...",
  "avatar": "..."
}
```

### Stop Typing

#### Client → Server: `typing:stop`

User stopped typing (or cleared input).

**Payload:**

```json
{
  "conversationId": "..."
}
```

**Server logic:**
1. Verify participant.
2. Broadcast to others: `typing:hide`

#### Server → Clients (others): `typing:hide`

**Payload:**

```json
{
  "conversationId": "...",
  "userId": "..."
}
```

**Best practices (learning):**
- Debounce on client: emit `typing:start` once on first keystroke, emit `typing:stop` after idle (e.g., 1–2 seconds) or on blur/send.
- Only broadcast to **other participants** (no need to echo back to sender).
- Keep payload minimal (include username/avatar for UI display).

---

## Read Receipts

Read receipts track which users have read which messages. This updates the UI (e.g., read ticks/checkmarks).

### Mark Messages as Read

#### Client → Server: `message:read`

User has read messages in a conversation (e.g., opened chat, scrolled to bottom).

**Payload:**

```json
{
  "conversationId": "...",
  "messageIds": ["...", "..."] // or can mark up to a certain point
}
```

**Server logic:**
1. Verify participant of conversation.
2. For each messageId, add `userId` to `readBy` array if not already present (idempotent).
3. Update `unreadCounts` for this user in Conversation (set to 0 or decrement as appropriate).
4. Broadcast to room (others): `message:read:update`

#### Server → Clients (others): `message:read:update`

Notify other participants that messages were read.

**Payload:**

```json
{
  "conversationId": "...",
  "messageIds": ["...", "..."],
  "readByUserId": "..."
}
```

**Alternative approach (mark all up to):** Instead of `messageIds`, can send `lastReadAt` or `upToMessageId` to mark all older messages as read—more efficient in busy chats.

**Learning point:** Read receipts are updated in DB (`Message.readBy`) and broadcast in real-time so sender sees "seen" status.

---

## Event Naming Conventions

Using consistent, namespaced event names improves readability and debugging:

| Pattern | Purpose |
|---|---|
| `connection` / `disconnect` | Built-in Socket.IO lifecycle |
| `conversation:join` / `conversation:leave` | Room management |
| `message:send` / `message:receive` | Messaging |
| `typing:start` / `typing:stop` / `typing:show` / `typing:hide` | Typing indicators |
| `message:read` / `message:read:update` | Read receipts |
| `user:online` / `user:offline` | Presence |

**Guideline:** Client→Server and Server→Client pairs are clearly named. Server→Client events are the "notifications/broadcasts".

---

## Error Handling in Sockets

Socket.IO errors should be handled gracefully to avoid crashing the server.

### Acknowledgements

Use acknowledgements for request-response style events (Client→Server expects confirmation):

```ts
// Client
socket.emit('message:send', payload, (response) => {
  if (response.error) { /* show error */ }
  else { /* success */ }
});

// Server
socket.on('message:send', async (payload, ack) => {
  try {
    // ... logic
    ack({ success: true, message: savedMessage });
  } catch (err) {
    ack({ success: false, error: err.message });
  }
});
```

### Connection Errors

On auth failure during `io.use()`, reject with error message. Client should handle `connect_error`:

```ts
socket.on('connect_error', (err) => {
  console.error('Connection failed:', err.message);
  // redirect to login or show message
});
```

### Validation

Validate all incoming payloads (event data). Use simple checks or Zod if added later. Return clear errors via acknowledgements.

---

## Data Structures (In-Memory)

These are planned for tracking live state:

| Structure | Key | Value | Purpose |
|---|---|---|---|
| **`onlineUsers`** | `userId` (or `clerkId`) | `Set<socketId>` | Track all active socket connections per user. Helps detect when user goes fully offline. |
| **`socketToUser`** | `socketId` | `{ userId, clerkId }` | Reverse map for quick lookup on disconnect. |

**Note:** These are in-memory and reset on server restart. That's fine for learning/local dev. Presence can be rehydrated from DB on startup if needed later.

---

## Implementation Plan

1. **Setup Socket.IO server** – Attach to HTTP server in `backend/src/index.ts` or dedicated `socket.server.ts`.
2. **Auth middleware for sockets** – `io.use()` to verify Clerk token on connect.
3. **Connection handler** – Track presence, update DB, broadcast online status.
4. **Room handlers** – `conversation:join/leave` with participant validation.
5. **Message handlers** – `message:send` (persist + broadcast), `message:receive` flow.
6. **Typing handlers** – `typing:start/stop` with broadcasts.
7. **Read receipt handlers** – `message:read` update DB + broadcast.
8. **Disconnect handler** – Cleanup presence, broadcast offline if last socket.
9. **Error handling** – Acknowledgements + connection errors.
10. **Add detailed comments** explaining rooms, auth, presence (learning focus).

---

## Testing Socket.IO Locally

Use tools like:
- **Browser console** – Quick testing with socket.io-client in frontend.
- **Postman/Insomnia** – Limited WebSocket testing, but Socket.IO has specific protocol.
- **[socket.io-admin-ui](https://github.com/socketio/socket.io-admin-ui)** (optional) – Visual monitoring (not planned, but good to know).
- **Simple test script** – Write a small Node script using `socket.io-client` to simulate events.

Also test with multiple browser tabs/devices to verify presence, rooms, and broadcasts.

---

## Related Documentation

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) – Real-time layer overview
- [`AUTH.md`](./AUTH.md) – Socket authentication
- [`DATABASE.md`](./DATABASE.md) – Models involved (Message, Conversation, User)
- [`API.md`](./API.md) – REST + Socket.IO interaction
- [`MIDDLEWARE.md`](./MIDDLEWARE.md) – Auth middleware parallels

---

*Last updated: Initial Socket.IO event design. Event names/payloads may be refined during implementation to match actual code.*