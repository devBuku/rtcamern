# Known Bugs / Deferred Fixes

Known issues in the current Socket.IO work. They are intentionally deferred so the rest of the project can be completed first. Re-check line numbers after further edits.

Scope: uncommitted Socket.IO changes in `backend/src/lib/socket.ts`, `backend/src/index.ts`, and `backend/src/controllers/message.controller.ts`.

---

## TODO

- [ ] **High** — Socket handshake trusts `userId` from the query string
- [ ] **Medium** — One socket per user, and disconnect deletes the wrong mapping
- [ ] **Low** — Presence is broadcast to unauthenticated sockets
- [ ] **Low** — `socket.ts` owns the Express app and HTTP server
- [ ] **Minor** — Unused `Express` import

When a fix lands, tick the box and move the entry to the **Fixed** section at the bottom.

---

## High — Socket handshake trusts `userId` from the query string

**Status:** Open
**Files:** `backend/src/lib/socket.ts:19-25`, `backend/src/controllers/message.controller.ts:169-172`

The server maps `socket.handshake.query.userId` to a socket without verifying Clerk identity. `sendMessage` then uses that map to emit `newMessage` to the receiver.

**Scenario:** any client connects with `?userId=<victim id>` and receives that user's real-time messages. No Clerk token is required. User IDs are enumerable through `GET /api/messages/users`, so this is practically exploitable. A client can also impersonate another user in the online list and inject arbitrary IDs into `getOnlineUsers`. CORS does not help; non-browser clients ignore it.

**Fix:** add an `io.use()` handshake middleware that verifies the Clerk token from `socket.handshake.auth.token` (or the session cookie), derives the user ID from the verified identity, and rejects unauthenticated connections. Do not trust query parameters. This matches `docs/SOCKETS.md`.

---

## Medium — One socket per user, and disconnect deletes the wrong mapping

**Status:** Open
**Files:** `backend/src/lib/socket.ts:16`, `backend/src/lib/socket.ts:30-33`

`userSocketMap` is `Record<string, string>`, so a second tab/device overwrites the first socket ID. The disconnect handler deletes by `userId` without checking which socket disconnected.

**Scenario:** tabs A and B are connected; A closes. A's disconnect handler deletes the map entry that now points to B. B stays connected but stops receiving `newMessage` and is reported offline. The same happens on a reconnect race where the old socket disconnects after the new one connects. Only one tab/device receives a given message, and the sender's other tabs never see their own sent message.

**Fix:** store `Map<string, Set<string>>`, add/remove the specific `socket.id`, delete the user entry only when the set is empty, and emit to every socket ID for the receiver.

---

## Low — Presence is broadcast to unauthenticated sockets

**Status:** Open
**Files:** `backend/src/lib/socket.ts:27`, `backend/src/lib/socket.ts:32`

`io.emit("getOnlineUsers", Object.keys(userSocketMap))` sends the full online-user list to every connected client, including clients that never authenticated.

**Fix:** broadcast only after authentication, and consider scoping presence to relevant contacts.

---

## Low — `socket.ts` owns the Express app and HTTP server

**Status:** Open
**Files:** `backend/src/lib/socket.ts:6-7`, `backend/src/index.ts:16`, `backend/src/controllers/message.controller.ts:13`

`socket.ts` creates `app` and `server`, and `index.ts` imports them. This inverts the entrypoint's ownership and makes `socket.ts` a side-effectful module that is also imported by the controller. Importing the controller in a test or script now creates an HTTP server and Socket.IO server.

**Fix:** create `app`/`server` in `index.ts`, pass `server` into a `createSocketServer(server)` helper, and expose only a narrow emit function to controllers.

---

## Minor — Unused `Express` import

**Status:** Open
**File:** `backend/src/index.ts:6`

`Express` is no longer used after `const app: Express` was removed. The build passes, so this is cleanup only.

---

## Fixed

_(none yet)_
