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

The User model represents an authenticated user in the application. Users are primarily authenticated via Clerk, but we store app-specific data (online status, last seen, themes, wallpapers, etc.) in MongoDB.

#### Fields

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| **`clerkId`** | `String` | Yes (Unique) | — | Clerk's unique user identifier. Used to link Clerk user to DB user. This is the primary reference for auth. |
| **`email`** | `String` | Yes | — | User's email address (from Clerk). Can be used for lookups and display. |
| **`username`** | `String` | Optional | — | Display/username. May be derived from Clerk profile or user-defined. |
| **`avatar`** | `String` | Optional | `""` or null | Profile picture URL (can come from Clerk or be user-uploaded later). |
| **`online`** | `Boolean` | Optional | `false` | Real-time presence flag (`true` if user has an active socket connection). Updated via Socket.IO events. |
| **`lastSeen`** | `Date` | Optional | `Date.now()` | Timestamp of when the user was last online. Useful for "last seen" indicators when offline. |
| **`themePrefs`** | `Object` | Optional | `{ theme: "light", mode: "light" }` | User's theme preferences (dark/light mode, multiple themes). Stored to persist across sessions/devices. |
| **`wallpaper`** | `String` | Optional | `null` | Selected chat wallpaper/background (URL or identifier). Personalization feature. |
| **`keyboardSound`** | `Boolean` | Optional | `false` | Toggle for optional keyboard sound effects. Respects user preference. |
| **`createdAt`** | `Date` | Auto | `Date.now()` | Timestamp when the user document was created. |
| **`updatedAt`** | `Date` | Auto | `Date.now()` | Timestamp when the user document was last updated. |

#### Design Rationale

- **`clerkId` as unique identifier:** Clerk is the source of truth for authentication. Storing `clerkId` avoids duplicating auth logic and makes webhook/user sync straightforward.
- **Separation of concerns:** Auth credentials stay in Clerk; app-specific state (presence, UI preferences) lives in MongoDB.
- **Presence fields (`online`, `lastSeen`):** Essential for "online user presence tracking" (highlight requirement). `online` is volatile (socket-driven), `lastSeen` persists history.
- **Preferences stored per-user:** Themes, wallpapers, and sound toggles improve UX and demonstrate user-specific settings.

#### Indexes (Planned)

- `clerkId` – Unique index (for fast lookup on auth/webhooks).
- `email` – Index (for potential lookups/admin features).
- `online` – Sparse/index if querying large online lists (optional optimization later).

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

The Message model stores individual chat messages. Supports both plain text and media (images/videos) with metadata from ImageKit.

#### Fields

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| **`conversationId`** | `ObjectId` (ref: `Conversation`) | Yes | — | Reference to the conversation this message belongs to. Critical for grouping and room broadcasts. |
| **`sender`** | `ObjectId` (ref: `User`) | Yes | — | Reference to the user who sent the message. Used for display (avatar, name) and permissions. |
| **`text`** | `String` | Optional | `""` | Message text content. Can be empty if message contains only media (or vice versa). |
| **`media`** | `[Object]` | Optional | `[]` | Array of media attachments (images/videos). Each object stores URLs, type, and ImageKit metadata. |
| **`readBy`** | `[ObjectId]` (ref: `User`) | Optional | `[]` | Array of user IDs who have read this message. Supports read receipts UI. |
| **`deliveredAt`** | `Date` | Optional | `Date.now()` | Timestamp when the message was delivered/persisted to server. Can differ from read time. |
| **`createdAt`** | `Date` | Auto | `Date.now()` | Message creation timestamp. Used for ordering and UI display. |
| **`updatedAt`** | `Date` | Auto | `Date.now()` | Last update (rare for messages, but useful for edits in future). |

#### Media Subdocument Structure

Each item in `media[]` will store:

| Field | Type | Required | Description |
|---|---|---|---|
| **`url`** | `String` | Yes | Main media URL (from ImageKit). Used for display. |
| **`thumbnailUrl`** | `String` | Optional | Thumbnail URL (especially useful for videos or image previews). Can be ImageKit transformation. |
| **`type`** | `"image" \| "video"` | Yes | Media type for rendering (image vs video element). |
| **`fileId`** | `String` | Optional | ImageKit file ID (useful for future deletion/management if needed). |
| **`key`** | `String` | Optional | ImageKit file path/key (for organization/reference). |
| **`size`** | `Number` | Optional | File size in bytes (for display/validation info). |
| **`mimeType`** | `String` | Optional | MIME type (e.g., `image/jpeg`, `video/mp4`) for validation/context. |

#### Design Rationale

- **`conversationId` + `createdAt`:** Core for message retrieval with pagination (infinite scroll). Messages are fetched by conversation ordered by time.
- **Text + Media combined:** Supports "image & video sharing" as stated in highlights. A message can be text-only, media-only, or mixed.
- **`readBy` array:** Tracks which participants have read each message. Enables read receipt indicators (e.g., double ticks/checks).
- **`deliveredAt` vs `readBy`:** Separates delivery vs read semantics—useful for real-time UX.
- **ImageKit metadata stored:** Storing `fileId`, `key`, `thumbnailUrl`, etc. keeps media traceable and enables future features (transformations, cleanup if needed).
- **References over embedding:** Using ObjectId refs (User, Conversation) keeps documents small and normalized. Populate as needed for UI.

#### Indexes (Planned)

- `{ conversationId: 1, createdAt: -1 }` – Critical for fetching messages with pagination (newest first) and efficient range queries.
- `{ conversationId: 1 }` – For general conversation message lookups.
- `{ sender: 1 }` – For user activity/history queries (optional).

---

## Relationships

| Relationship | Type | Description |
|---|---|---|
| **User ↔ Conversation** | Many-to-Many | A user can be in multiple conversations; a conversation has multiple participants (`participants` array). |
| **Conversation ↔ Message** | One-to-Many | One conversation contains many messages. Each message belongs to exactly one conversation. |
| **User ↔ Message** | One-to-Many | A user can send many messages; each message has one sender. |
| **Message ↔ Read Receipts** | Many-to-Many (implicit) | `readBy` references multiple users who have read a message. |

---

## Data Integrity & Considerations

- **Duplicate 1:1 conversations (planned prevention):** For 1:1 chats, ensure we don't create duplicate conversations between the same two users. Can be enforced by ordering participant IDs and using a compound unique index (e.g., `participants` sorted) or by checking before creation.
- **Soft vs Hard Deletes:** Initially, hard deletes are not planned. For learning, focus on core CRUD. Can consider soft deletes later if needed (archived conversations, deleted messages).
- **Message Pagination:** Messages will be fetched with limit/skip or cursor-based pagination using `createdAt` (or `_id`) for infinite scroll—important for performance as chats grow.
- **Orphaned Media (future):** If messages are deleted, ImageKit media might become orphaned. The planned cron job (see [`WEBHOOKS_CRON.md`](./WEBHOOKS_CRON.md)) can help with cleanup of orphaned/temp files.
- **Validation:** Mongoose schema validation + application-level validation (e.g., Zod if added later) to ensure data integrity.
- **Timestamps:** Mongoose `timestamps: true` can be used to auto-manage `createdAt`/`updatedAt`.

---

## Evolution Notes

- **Group Chats:** Model already supports `isGroup`, `groupName`, `groupAvatar`. If implemented later, group logic (permissions, read receipts per member) will be documented here.
- **Message Reactions/Edits (future):** Fields can be extended later. Current design keeps it minimal and focused on core requirements.
- **Typing State:** Typing is ephemeral (socket-only), not persisted in DB—correct design choice.

---

## Related Documentation

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) – High-level data flow
- [`API.md`](./API.md) – REST endpoints for CRUD operations
- [`SOCKETS.md`](./SOCKETS.md) – How messages/presence flow in real-time
- [`AUTH.md`](./AUTH.md) – User sync and Clerk integration
- [`MEDIA.md`](./MEDIA.md) – Media storage and Message.media structure

---

*Last updated: Initial schema design (User, Conversation, Message). This document will be updated as models are actually implemented in code.*