# Architecture

## Overview

rtcamern is a learning-focused, real-time chat application built with the MERN stack (MongoDB, Express.js, React, Node.js) and Socket.IO for real-time communication. The goal is to build it by hand to understand the underlying concepts of authentication, real-time messaging, media handling, webhooks, cron jobs, and middleware.

This document describes the high-level system architecture, data flow, and design decisions. It will evolve as features are implemented.

---

## High-Level Architecture

The application follows a client-server architecture with a separate frontend (React + Vite) and backend (Express + Node.js). Real-time communication is handled via a custom Socket.IO WebSocket server.

```text
Client (React + Vite)
│
├─ REST API calls → Express Server (Node.js)
│
├─ WebSocket (Socket.IO) → Custom Socket.IO Server
│
├─ Auth → Clerk
│
├─ Media → ImageKit (Uploads & Transformations)
│
└─ State/Data → MongoDB (Mongoose ODM)
```

---

## Tech Stack

| Layer | Technology | Purpose | Notes |
|---|---|---|---|
| **Frontend** | [React](https://react.dev/) + [Vite](https://vite.dev/) + [TypeScript](https://www.typescriptlang.org/) | UI Framework & Build Tool | Fast development, type safety, and modern tooling. |
| **Styling (Planned)** | [Tailwind CSS](https://tailwindcss.com/) + [Hero UI](https://heroui.com/) | Styling & Component Library | Enables consistent theming, dark/light mode, and reusable accessible components. |
| **Backend** | [Node.js](https://nodejs.org/) + [Express.js](https://expressjs.com/) | REST API Server | Handles API routes, business logic, authentication, and file uploads. |
| **Real-Time** | [Socket.IO](https://socket.io/) | Custom WebSocket Server | Enables real-time messaging, typing indicators, online presence, and read receipts. Built from scratch (no Firebase/Supabase). |
| **Database** | [MongoDB](https://www.mongodb.com/) + [Mongoose](https://mongoosejs.com/) | NoSQL Database & ODM | Stores users, conversations, and messages with schema validation. |
| **Authentication** | [Clerk](https://clerk.com/) | Auth Provider | Handles sign-in/sign-up, JWT tokens, and user management. Backend verifies tokens and syncs users to DB. |
| **Media Storage** | [ImageKit](https://imagekit.io/) | Media Hosting & Transformations | Stores uploaded images/videos and provides on-the-fly transformations (thumbnails, optimizations). |
| **File Uploads** | [Multer](https://github.com/expressjs/multer) | Multipart Form Handling | Implements file uploads from scratch with validation, size limits, and storage configuration. |
| **Scheduled Tasks** | [node-cron](https://github.com/node-cron/node-cron) | Cron Jobs | For scheduled/background tasks (e.g., cleanup of orphaned temporary files). |
| **Environment** | [dotenv](https://github.com/motdotla/dotenv) | Environment Config | Manages environment variables securely. |

> **Note:** Some packages (Socket.IO, Multer, ImageKit, Clerk, node-cron, Tailwind, Hero UI) are part of the planned feature set. The current codebase is in its early foundation stage and will evolve to include them.

---

## System Components

### 1. Frontend (Client)

- **Framework:** React with TypeScript, built with Vite.
- **Responsibilities:**
  - Render the chat UI, authentication flows, and user settings.
  - Establish and maintain Socket.IO connection for real-time events.
  - Handle media uploads (images/videos) and previews.
  - Manage theming (dark/light), wallpapers, and keyboard sound preferences.
  - Communicate with backend via REST API and WebSocket events.

### 2. Backend (Server)

- **Framework:** Express.js with TypeScript, running on Node.js.
- **Responsibilities:**
  - Expose REST API endpoints for auth sync, conversations, messages, and media uploads.
  - Host the custom Socket.IO WebSocket server for real-time communication.
  - Handle authentication via Clerk JWT verification (middleware).
  - Manage file uploads from scratch using Multer with validation.
  - Upload media to ImageKit and store references in the database.
  - Process webhooks (e.g., Clerk user events) for user lifecycle management.
  - Run cron jobs for scheduled maintenance tasks.
  - Connect to MongoDB using Mongoose.

### 3. Database (MongoDB)

The data layer will consist of core models: **User**, **Conversation**, and **Message**. See [`DATABASE.md`](./DATABASE.md) for detailed schema definitions, relationships, and design rationale.

### 4. Real-Time Layer (Socket.IO)

A custom WebSocket server is implemented from scratch (no third-party realtime BaaS). Key responsibilities:
- Authenticate socket connections using Clerk identity.
- Manage rooms per conversation (`conversationId`) to ensure targeted message delivery.
- Emit and broadcast events for messages, typing, online presence, and read receipts.
- Track connected users for presence (online/offline status + lastSeen).

See [`SOCKETS.md`](./SOCKETS.md) for event contracts, payloads, and room management details.

---

## Data Flow

### 1. Authentication Flow (High-Level)

1. User signs in/up via Clerk on the frontend.
2. Frontend obtains a JWT/session token from Clerk.
3. For protected REST requests, the token is sent in the `Authorization` header.
4. Backend `auth` middleware verifies the Clerk token and attaches the authenticated user context to the request.
5. User data is synced to MongoDB (either on first access or via Clerk webhooks) to maintain app-specific fields (avatar, online status, preferences, etc.).

See [`AUTH.md`](./AUTH.md) for a detailed breakdown (including webhooks).

### 2. Real-Time Messaging Flow

1. Authenticated user joins a conversation room via Socket.IO (`join_conversation`).
2. User sends a message (`send_message`) via WebSocket (text and/or media reference).
3. Backend validates, persists the message to MongoDB (linked to conversation + sender).
4. Message is broadcast to all participants in the conversation room.
5. Recipients receive the message in real-time and can emit `message_read`/`message_delivered` events.
6. Typing events (`typing`, `stop_typing`) are broadcast to other participants without persisting to DB.

### 3. Media Upload Flow

1. User selects an image/video in the frontend.
2. File is sent to backend via REST endpoint with multipart/form-data.
3. Multer middleware (custom implementation from scratch) validates file type, size, and handles storage.
4. Backend uploads the validated file to **ImageKit** for hosting and transformations.
5. ImageKit returns a URL (and optional transformation URLs) along with metadata.
6. The media reference is stored in the `Message.media` array in MongoDB and sent alongside the message.

See [`MEDIA.md`](./MEDIA.md) for the full explanation of "file uploads from scratch" and ImageKit integration.

---

## Key Architectural Principles

- **Learning-First:** Prioritize clarity and understanding over premature optimization. Every major concept is documented and explained.
- **Separation of Concerns:** Clear separation between client, server, routes, controllers, middleware, models, sockets, and utilities.
- **Type Safety:** TypeScript is used on both frontend and backend to catch errors early and improve maintainability.
- **Security Fundamentals:** Auth is enforced on protected routes and socket connections. File validation (type/size), CORS configuration, and input handling are considered core parts of the learning.
- **Custom Implementations:** Socket.IO server and file uploads are implemented from scratch to understand the underlying mechanics (as requested).
- **Progressive Documentation:** Architecture evolves with the codebase. Diagrams and explanations are updated as features are added, never assumed.

---

## Planned Diagrams

The following Mermaid diagrams will be added as the implementation matures:

- **Client–Server Flow:** Overall request/response + WebSocket flow
- **Authentication Flow:** Clerk + backend verification + DB sync (+ webhooks)
- **Database ERD:** Relationships between User, Conversation, and Message
- **Socket Event Flow:** Message sending, typing, presence, read receipts
- **Media Upload Flow:** Multer → Validation → ImageKit → DB → Client
- **Webhook & Cron Flow:** Clerk webhooks and scheduled cron jobs

*(These diagrams will be added to this document when the respective features are implemented and documented.)*

---

## Related Documentation

- [`SETUP.md`](./SETUP.md) – Local development setup
- [`DATABASE.md`](./DATABASE.md) – Data models and schema design
- [`AUTH.md`](./AUTH.md) – Authentication and webhooks
- [`API.md`](./API.md) – REST API endpoints
- [`SOCKETS.md`](./SOCKETS.md) – Real-time events and Socket.IO
- [`MEDIA.md`](./MEDIA.md) – File uploads (Multer) and ImageKit
- [`MIDDLEWARE.md`](./MIDDLEWARE.md) – Auth, error, and upload middleware
- [`WEBHOOKS_CRON.md`](./WEBHOOKS_CRON.md) – Webhooks and cron jobs
- [`UI.md`](./UI.md) – Theming, wallpapers, and sound effects
- [`ENV.md`](./ENV.md) – Environment variables
- [`DEPLOYMENT.md`](./DEPLOYMENT.md) – Deployment guide
- [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md) – Common issues

---

*Last updated: Initial draft based on current project state. This document will be kept in sync with actual implementation.*