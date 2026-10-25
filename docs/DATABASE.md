# Database Design

This document outlines the database schema design for **rtcamern**, including models, fields, relationships, indexes, and the reasoning behind design decisions. All models will be implemented using [Mongoose](https://mongoosejs.com/) with TypeScript.

This is a learning-focused design—explanations focus on *why* each choice is made, not just *what* exists.

---

## Overview

The application uses **MongoDB** (a NoSQL document database) to store:

1. **Users** – Authenticated users, synced from Clerk with app-specific data (presence, preferences).
2. **Conversations** – Chat conversations between participants (1:1 initially).
3. **Messages** – Individual messages within conversations, including text and media references.

---

## Data Models

### 1. User Model

The User model represents an authenticated user in the application. Users are authenticated via Clerk; the MongoDB document is kept in sync by the Clerk webhook.

> **Current schema:** only `clerkId`, `email`, `fullName`, `profilePic`, and timestamps exist today. Presence and preference fields are future work.

#### Fields

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| **`clerkId`** | `String` | Yes (Unique) | — | Clerk's unique user identifier. Links the Clerk user to the DB user. |
| **`email`** | `String` | Yes (Unique) | — | User's primary email from Clerk. |
| **`fullName`** | `String` | Yes | — | Display name derived from Clerk's first/last name, username, or email prefix. |
| **`profilePic`** | `String` | Optional | `""` | Profile picture URL from Clerk. |
| **`createdAt`** | `Date` | Auto | `Date.now()` | Timestamp when the user document was created. |
| **`updatedAt`** | `Date` | Auto | `Date.now()` | Timestamp when the user document was last updated. |

#### Design Rationale

- **`clerkId` as unique identifier:** Clerk is the source of truth for authentication. Storing `clerkId` avoids duplicating auth logic and makes webhook/user sync straightforward.
- **Webhook-driven sync:** `user.created` / `user.updated` upsert by `clerkId`; `user.deleted` removes the document.
- **Future state:** Presence (`online`, `lastSeen`) and UI preferences (theme, wallpaper, sound) are planned but not implemented.

#### Indexes

- `clerkId` – Unique index (auth/webhook lookups).
- `email` – Unique index.

---

### 2. Conversation Model

A Conversation represents a chat between one or more participants. Initially, **1:1 conversations** are the focus. The model is designed to be extensible for group chats if needed later.

#### Fields

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| **`participants`** | `[ObjectId]` (ref: `User`) | Yes | — | Array of User references participating in this conversation. For 1:1, contains exactly 2 users. |
| **`lastMessage`** | `ObjectId` (ref: `Message`) | Optional | `null` | Reference to the most recent message in this conversation. Useful for sidebar previews (last message, timestamp) without fetching all messages. |
| **`lastMessageAt`** | `Date` | Optional | `null` | Timestamp of the last message. Helps with sorting conversations by recency. |
| **`unreadCounts`** | `Map` or `Object` | Optional | `{}` | Per-user unread message count (e.g., `{ userId: count }`). Useful for showing unread badges in the UI. |
| **`isGroup`** | `Boolean` | Optional | `false` | Flag to distinguish 1:1 vs group conversations. Allows future extension for group chats. |
| **`groupName`** | `String` | Optional | `null` | Group name (only used if `isGroup` is true). |
| **`groupAvatar`** | `String` | Optional | `null` | Group avatar/image (optional for groups). |
| **`createdAt`** | `Date` | Auto | `Date.now()` | Conversation creation timestamp. |
| **`updatedAt`** | `Date` | Auto | `Date.now()` | Last update timestamp (e.g., when new message arrives). |

#### Design Rationale

- **Participants as refs:** Normalizes user data, avoids duplication. Can populate participant details when fetching conversations.
- **`lastMessage` + `lastMessageAt`:** Denormalization for performance. Avoids aggregating to get the latest message when listing conversations (common in chat UIs).
- **`unreadCounts`:** Tracks per-user unread state. Essential for real-world chat UX. Updated on message send/read events.
- **1:1-first with extensibility:** `isGroup` flag keeps model flexible without over-engineering for the initial scope (matches "1:1 only" as a safe starting point, extensible to groups).
- **Rooming by conversation:** Conversations map 1:1 to Socket.IO rooms (`conversationId`), isolating message broadcasts.

#### Indexes (Planned)

- `{ participants: 1 }` – To efficiently find conversations between users.
- `{ participants: 1, isGroup: 1 }` – Compound index for 1:1 lookup (avoid duplicates).
- `{ lastMessageAt: -1 }` – For sorting user conversations by recency.

---

### 3. Message Model

The Message model stores individual chat messages. Each message is between two users (`senderId`/`receiverId`) and may contain text and/or one media URL.

> **Current schema:** messages are 1:1 and store a single `image` or `video` URL. There is no `Conversation` collection, `media[]` array, read receipts, or delivery metadata yet.

#### Fields

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| **`senderId`** | `ObjectId` (ref: `User`) | Yes | — | User who sent the message. |
| **`receiverId`** | `ObjectId` (ref: `User`) | Yes | — | User who receives the message. |
| **`text`** | `String` | Optional | — | Message text. May be absent when a media URL is present. |
| **`image`** | `String` | Optional | `null` | ImageKit URL for an uploaded image. |
| **`video`** | `String` | Optional | `null` | ImageKit URL for an uploaded video. |
| **`createdAt`** | `Date` | Auto | `Date.now()` | Message creation timestamp (used for ordering). |
| **`updatedAt`** | `Date` | Auto | `Date.now()` | Last update timestamp. |

#### Media Storage

Only the uploaded URL is persisted (`image` or `video`). ImageKit metadata such as `fileId`, `thumbnailUrl`, `size`, and `mimeType` is **not** stored yet; it is returned by the SDK but discarded.

#### Design Rationale

- **`senderId` + `receiverId` + `createdAt`:** Enough to fetch a 1:1 history ordered by time without a separate conversation document.
- **Text + single media field:** Supports text-only, media-only, or mixed messages while keeping the document small.
- **Derived conversations:** The sidebar aggregation groups messages by the other participant (`GET /api/messages/conversations`), so no `Conversation` collection is required yet.
- **Future state:** `media[]`, read receipts, delivery timestamps, and group conversations are planned.

#### Indexes

No explicit indexes yet. A compound `{ senderId: 1, receiverId: 1, createdAt: 1 }` would help the history query as data grows.

---

## Relationships

| Relationship | Type | Description |
|---|---|---|
| **User ↔ Message (sent)** | One-to-Many | A user can send many messages (`senderId`). |
| **User ↔ Message (received)** | One-to-Many | A user can receive many messages (`receiverId`). |
| **User ↔ User (chat)** | Many-to-Many (implicit) | A message links two users; there is no join/Conversation document. |
| **Conversation ↔ Message** | Not implemented | Conversations are derived from messages; there is no Conversation collection. |

---

## Data Integrity & Considerations

- **1:1 messages only:** `senderId` and `receiverId` are both required; there is no conversation document, so there is no duplicate-conversation concern yet.
- **Deletes:** Messages are not cascade-deleted when a user is deleted. The conversations aggregation filters out partners whose user record no longer exists.
- **Message Pagination:** Not implemented yet — `GET /api/messages/:id` returns the full history sorted oldest-first.
- **Orphaned Media (future):** Deleting messages does not remove ImageKit files; a cleanup job is future work.
- **Validation:** Mongoose schema validation plus controller-level checks (`:id` ObjectId validity, text-or-media required).
- **Timestamps:** `timestamps: true` manages `createdAt`/`updatedAt`.

---

## Evolution Notes

- **Group Chats:** Not implemented. The current model is strictly 1:1 (`senderId`/`receiverId`); group support is a future design.
- **Message Reactions/Edits (future):** Fields can be extended later. Current design keeps it minimal and focused on core requirements.
- **Typing State:** Typing is ephemeral (socket-only), not persisted in DB—correct design choice.

---

## Related Documentation

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) – High-level data flow
- [`API.md`](./API.md) – REST endpoints for CRUD operations
- [`SOCKETS.md`](./SOCKETS.md) – How messages/presence flow in real-time
- [`AUTH.md`](./AUTH.md) – User sync and Clerk integration
- [`MEDIA.md`](./MEDIA.md) – Media storage and `Message.image` / `Message.video` fields

---

*Last updated: Reflects the implemented User and Message schemas (Conversation model is a design target only).*