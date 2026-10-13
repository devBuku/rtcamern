# rtcamern

> **Real-Time Chat Application using MERN Stack + Socket.IO**

A learning-focused, hand-coded real-time chat application built with the MERN stack (MongoDB, Express.js, React, Node.js) and Socket.IO. This project is built from scratch to understand core concepts like authentication, real-time communication, media handling, webhooks, cron jobs, and middleware.

**Live Demo:** [https://rtcamern.onrender.com/](https://rtcamern.onrender.com/)

![Status](https://img.shields.io/badge/status-in%20progress-yellow)
![License](https://img.shields.io/badge/license-MIT-blue)
![Tech](https://img.shields.io/badge/tech-MERN%20%2B%20Socket.IO-brightgreen)

---

## Table of Contents

- [About](#about)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Folder Structure](#folder-structure)
- [Prerequisites](#prerequisites)
- [Getting Started (Local Setup)](#getting-started-local-setup)
- [Docker (Single Container)](#docker-single-container)
- [Environment Variables](#environment-variables)
- [Core Concepts](#core-concepts)
- [Documentation](#documentation)
- [API Reference](#api-reference)
- [Socket.IO Events](#socketio-events)
- [Database Models](#database-models)
- [Theming, Wallpapers & Sounds](#theming-wallpapers--sounds)
- [Deployment](#deployment)
- [Scripts](#scripts)
- [Project Roadmap/Phases](#project-roadmapphases)
- [Learning Takeaways](#learning-takeaways)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## About

**rtcamern** is a resume-ready, production-style real-time chat app built entirely by hand for learning purposes. It covers everything from authentication and real-time messaging to file uploads from scratch, media transformations with ImageKit, webhooks, cron jobs, custom WebSocket server, theming, and deployment.

The goal is to deeply understand each concept by implementing it step by step, with thorough documentation explaining the *why* behind every decision.

---

## Features

- 💬 **Real-Time Messaging** – Instant chat with Socket.IO (custom WebSocket server, no Firebase/Supabase)
- 🔐 **Authentication with Clerk** – Secure sign-in/sign-up with JWT verification
- 👥 **User Sync & Webhooks** – Sync users from Clerk via webhooks and lazy sync
- 🟢 **Online User Presence** – Track online/offline status with last seen
- ⌨️ **Typing Indicators** – See when others are typing in real-time
- ✅ **Read Receipts** – Track message read status
- 🖼️ **Image & Video Sharing** – Upload and share media in chats
- 📤 **File Uploads from Scratch** – Multer setup with validation, limits, memory vs disk explained
- ☁️ **ImageKit Integration** – Media hosting, CDN delivery & on-the-fly transformations
- 🎨 **Dark/Light Mode** – Theme switching with persistence
- 🖌️ **Multiple Themes** – Customizable theme variants
- 🖼️ **Chat Wallpapers** – Personalize chat background
- 🔊 **Keyboard Sound Effects** – Optional subtle sounds on actions
- 🧱 **Custom Middleware** – Auth, error, and upload middleware with detailed explanations
- ⏰ **Cron Jobs** – Scheduled background tasks (e.g., temp file cleanup) explained
- 🌐 **REST API** – Well-structured endpoints with auth and validation
- 💾 **MongoDB Integration** – Mongoose schemas for users, conversations, messages
- 📱 **Responsive Design** – Mobile-first UI with Tailwind CSS + Hero UI
- 🚀 **Free Deployment Ready** – Deploy to Render/Railway + Netlify/Vercel + MongoDB Atlas
- 📚 **Thorough Documentation** – Architecture, setup, API, sockets, media, and more

---

## Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Frontend** | [React](https://react.dev/) + [Vite](https://vite.dev/) + [TypeScript](https://www.typescriptlang.org/) | Modern, fast, type-safe UI development |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) + [Hero UI](https://heroui.com/) | Utility-first styling with accessible, themeable components |
| **Backend** | [Node.js](https://nodejs.org/) + [Express.js](https://expressjs.com/) + [TypeScript](https://www.typescriptlang.org/) | Scalable API server with type safety |
| **Real-Time** | [Socket.IO](https://socket.io/) | Custom WebSocket server for bi-directional communication |
| **Database** | [MongoDB](https://www.mongodb.com/) + [Mongoose](https://mongoosejs.com/) | Flexible NoSQL with schema validation |
| **Auth** | [Clerk](https://clerk.com/) | Easy auth with JWT, webhooks, and great DX |
| **Media** | [Multer](https://github.com/expressjs/multer) + [ImageKit](https://imagekit.io/) | File uploads from scratch + cloud media with transformations |
| **Cron Jobs** | [node-cron](https://github.com/node-cron/node-cron) | Simple, reliable task scheduling |
| **Webhooks** | [svix](https://github.com/svix/svix-libs) | Secure webhook signature verification |
| **Env Config** | [dotenv](https://github.com/motdotla/dotenv) | Manage environment variables |

---

## Architecture Overview

rtcamern follows a client-server architecture with a custom Socket.IO WebSocket server. Frontend (React+Vite) communicates via REST API and WebSocket events. Backend (Express+Node) handles auth, business logic, media uploads, webhooks, cron jobs, and real-time communication. Data is stored in MongoDB, media in ImageKit, auth in Clerk.

For a detailed breakdown with diagrams (to be added as implementation progresses), see **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)**.

---

## Folder Structure

```text
rtcamern/
├── backend/        # Express + TypeScript API server
│   ├── src/
│   │   ├── constants/   # Env/constants
│   │   ├── controllers/ # Route handlers (planned)
│   │   ├── cron/        # Cron jobs (planned)
│   │   ├── lib/         # DB, ImageKit, Socket setup (planned)
│   │   ├── middleware/  # Auth, upload, error (planned)
│   │   ├── models/      # Mongoose models (planned)
│   │   ├── routes/      # API routes (planned)
│   │   ├── socket/      # Socket.IO handlers (planned)
│   │   ├── utils/       # Helpers, errors (planned)
│   │   ├── webhooks/    # Webhook handlers (planned)
│   │   └── index.ts     # Entry point
│   ├── .env.example
│   └── package.json
├── frontend/       # React + Vite + TypeScript client
│   ├── src/
│   │   ├── assets/      # Images, sounds, icons
│   │   ├── components/  # UI components (planned)
│   │   ├── hooks/       # Custom hooks (planned)
│   │   ├── lib/         # Client utils/config (planned)
│   │   ├── pages/       # Pages/routes (planned)
│   │   └── ...
│   └── package.json
├── docs/           # Comprehensive project documentation
└── AGENTS.md       # Agent instructions for this project
```

---

## Prerequisites

- [Node.js](https://nodejs.org/) (LTS v20+)
- [Yarn](https://yarnpkg.com/) (v4 Berry, pinned via `packageManager` in both packages)
- [MongoDB](https://www.mongodb.com/) (local or Atlas free tier)
- [Git](https://git-scm.com/)
- [Clerk](https://clerk.com/) account (free)
- [ImageKit](https://imagekit.io/) account (free)

---

## Getting Started (Local Setup)

1. **Clone the repo**
   ```bash
   git clone <your-repo-url>
   cd rtcamern
   ```

2. **Backend setup**
   ```bash
   cd backend
   yarn install
   cp .env.example .env
   # Edit .env with your values (see ENV.md)
   yarn dev
   ```
   Server runs at `http://localhost:3000`. Health check: `GET /health`.

3. **Frontend setup** (new terminal)
   ```bash
   cd frontend
   yarn install
   yarn dev
   ```
   App runs at `http://localhost:5173`.

For detailed step-by-step instructions, see **[docs/SETUP.md](./docs/SETUP.md)**.

---

## Docker (Single Container)

The app ships as a **single Docker image**: the Express API serves the built Vite frontend (monolith). MongoDB is external ([MongoDB Atlas](https://www.mongodb.com/atlas) free tier) — no database runs inside the container.

Build (frontend `VITE_*` values are inlined at build time, so pass them as `--build-arg`):

```bash
docker build \
  --build-arg VITE_CLERK_PUBLISHABLE_KEY=pk_live_xxx \
  -t rtcamern:latest .
```

Run (point `MONGO_URI` at Atlas):

```bash
docker run --rm -p 3001:3001 \
  -e MONGO_URI="mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority" \
  -e DB_NAME=rtcamern \
  -e CLERK_PUBLISHABLE_KEY=pk_live_xxx \
  -e CLERK_SECRET_KEY=sk_live_xxx \
  -e FRONTEND_URL=http://localhost:3001 \
  rtcamern:latest
```

Then open `http://localhost:3001`.

Notes:
- `NODE_ENV=production` is set in the image, so the backend reads `MONGO_URI` (not `MONGO_URI_DOCKER`).
- The image runs as the non-root `node` user and exposes port `3001`.
- Build layout: frontend `dist` → `/app/public`, compiled backend JS → `/app/dist`.
- For local development, `backend/docker-compose.yaml` still provides a standalone MongoDB container (`yarn docker:up` in `backend/`).

---

## Environment Variables

Environment variables are documented in detail in **[docs/ENV.md](./docs/ENV.md)**.

**Backend (`backend/.env`):**
```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/rtcamern
# Clerk, ImageKit, FRONTEND_URL, CLERK_WEBHOOK_SECRET etc. (added as implemented)
```

**Frontend (`frontend/.env`):**
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
```

---

## Core Concepts

Understanding these concepts is the heart of this learning project. Each is explained thoroughly in code and docs:

| Concept | What You'll Learn | Docs |
|---|---|---|
| **Custom WebSocket Server** | Socket.IO setup from scratch, rooms, events, presence | [docs/SOCKETS.md](./docs/SOCKETS.md) |
| **Authentication (Clerk)** | JWT verification, protected routes, user sync | [docs/AUTH.md](./docs/AUTH.md) |
| **File Uploads from Scratch** | Multer config, memory vs disk, validation, limits, MIME checks | [docs/MEDIA.md](./docs/MEDIA.md) |
| **ImageKit Media** | Uploading, URLs, transformations, CDN | [docs/MEDIA.md](./docs/MEDIA.md) |
| **Middleware Explained** | Auth, error, upload middleware with execution order | [docs/MIDDLEWARE.md](./docs/MIDDLEWARE.md) |
| **Webhooks** | Event-driven sync, signature verification, security | [docs/WEBHOOKS_CRON.md](./docs/WEBHOOKS_CRON.md) |
| **Cron Jobs** | Scheduled tasks, automation, practical demos | [docs/WEBHOOKS_CRON.md](./docs/WEBHOOKS_CRON.md) |
| **Realtime Features** | Messaging, typing, online presence, read receipts | [docs/SOCKETS.md](./docs/SOCKETS.md) |
| **Theming & Personalization** | Dark/Light, themes, wallpapers, sounds | [docs/UI.md](./docs/UI.md) |

---

## Documentation

All project documentation lives in the [`docs/`](./docs/) folder and is kept in sync with the codebase:

| Document | Purpose |
|---|---|
| **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)** | High-level system design, data flow, tech stack, diagrams (planned) |
| **[SETUP.md](./docs/SETUP.md)** | Step-by-step local setup guide |
| **[ENV.md](./docs/ENV.md)** | Environment variables reference with explanations |
| **[DATABASE.md](./docs/DATABASE.md)** | User, Conversation, Message schemas, relationships, rationale |
| **[AUTH.md](./docs/AUTH.md)** | Clerk auth flow, token verification, webhooks, user sync |
| **[API.md](./docs/API.md)** | REST API endpoints, auth, request/response examples |
| **[SOCKETS.md](./docs/SOCKETS.md)** | Socket.IO events, rooms, presence, typing, read receipts |
| **[MEDIA.md](./docs/MEDIA.md)** | File uploads from scratch (Multer) + ImageKit integration |
| **[MIDDLEWARE.md](./docs/MIDDLEWARE.md)** | Auth, error, upload middleware deep-dive |
| **[WEBHOOKS_CRON.md](./docs/WEBHOOKS_CRON.md)** | Webhooks & cron jobs explained with examples |
| **[UI.md](./docs/UI.md)** | Theming, wallpapers, sounds, design system, UI polish guidelines |
| **[DEPLOYMENT.md](./docs/DEPLOYMENT.md)** | Free deployment guide (Render/Railway, Netlify/Vercel, Atlas) |
| **[TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)** | Common issues and fixes |

---

## API Reference

REST API endpoints are documented in **[docs/API.md](./docs/API.md)**. Key planned routes:

- `GET /health` – Health check (public)
- `GET /api/auth/me` – Get current user (protected)
- `POST/GET /api/conversations` – Manage conversations (protected)
- `GET/POST /api/messages` – Manage messages (protected)
- `POST /api/upload` – Upload media (protected)
- `POST /api/webhooks/clerk` – Clerk webhooks (public, verified)

---

## Socket.IO Events

Real-time events are documented in **[docs/SOCKETS.md](./docs/SOCKETS.md)**. Key events:

| Event | Direction | Purpose |
|---|---|---|
| `connection/disconnect` | Built-in | Lifecycle |
| `conversation:join/leave` | Client↔Server | Room management |
| `message:send` | Client→Server | Send message |
| `message:receive` | Server→Client | Receive broadcast |
| `typing:start/stop` | Client→Server | Typing state |
| `typing:show/hide` | Server→Client | Notify others |
| `message:read` | Client→Server | Mark as read |
| `message:read:update` | Server→Client | Notify read |
| `user:online/offline` | Server→Client | Presence |

---

## Database Models

Data models are defined in **[docs/DATABASE.md](./docs/DATABASE.md)**:

- **User** – `clerkId`, `email`, `username`, `avatar`, `online`, `lastSeen`, `themePrefs`, `wallpaper`, `keyboardSound`
- **Conversation** – `participants`, `lastMessage`, `lastMessageAt`, `unreadCounts`, `isGroup`, `groupName`
- **Message** – `conversationId`, `sender`, `text`, `media[]`, `readBy`, `deliveredAt`, `createdAt`

Relationships: User↔Conversation (many-to-many), Conversation↔Message (one-to-many), User↔Message (one-to-many).

---

## Theming, Wallpapers & Sounds

UI customization and polish details in **[docs/UI.md](./docs/UI.md)**:

- **Dark/Light Mode** – Toggle with persistence (localStorage + DB)
- **Multiple Themes** – Hero UI theme variants
- **Wallpapers** – Selectable chat background with preview
- **Keyboard Sounds** – Optional subtle sound effects on actions
- **UI Polish Guidelines** – Targeted suggestions for layout, spacing, typography, chat UI, responsiveness, accessibility

---

## Deployment

Free deployment is fully documented in **[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)**.

**Recommended stack (100% free):**
- **Frontend:** [Netlify](https://www.netlify.com/) or [Vercel](https://vercel.com/)
- **Backend:** [Render](https://render.com/) or [Railway](https://railway.app/)
- **Database:** [MongoDB Atlas](https://www.mongodb.com/atlas) (M0 free cluster)
- **Auth:** [Clerk](https://clerk.com/) (free tier)
- **Media:** [ImageKit](https://imagekit.io/) (free tier)

**Live Demo:** [https://rtcamern.onrender.com/](https://rtcamern.onrender.com/)

---

## Scripts

### Backend (`backend/package.json`)
```bash
yarn dev      # Start dev server with tsx watch
yarn build    # Compile TypeScript with tsc (outputs to dist/)
yarn start    # Run the compiled app (node dist/index.js)
```

### Frontend (`frontend/package.json`)
```bash
yarn dev      # Start Vite dev server
yarn build    # Build for production (tsc -b && vite build)
yarn lint     # Lint code
yarn preview  # Preview production build
```

---

## Project Roadmap/Phases

This is a hand-coded learning project. Progression is incremental:

| Phase | Focus | Status |
|---|---|---|
| **Phase 0: Foundation** | Repo setup, backend/frontend init, health route, docs structure | ✅ Done (current state) |
| **Phase 1: Auth & User Sync** | Clerk integration, auth middleware, lazy sync, protected routes | ⏳ Next |
| **Phase 2: Database Models** | User, Conversation, Message models with Mongoose | ⏳ Next |
| **Phase 3: REST API Core** | Conversations & messages CRUD endpoints | ⏳ Planned |
| **Phase 4: Custom WebSocket Server** | Socket.IO setup, auth, rooms, messaging, presence, typing, read receipts | ⏳ Planned |
| **Phase 5: File Uploads from Scratch** | Multer config, validation, upload middleware | ⏳ Planned |
| **Phase 6: ImageKit Integration** | Media upload, URLs, transformations | ⏳ Planned |
| **Phase 7: Webhooks** | Clerk webhooks, signature verification, user lifecycle | ⏳ Planned |
| **Phase 8: Cron Jobs** | Scheduled tasks, cleanup demos | ⏳ Planned |
| **Phase 9: UI/UX & Theming** | Chat UI, dark/light, themes, wallpapers, sounds | ⏳ Planned |
| **Phase 10: Polish & Deploy** | UI polish, bug fixes, deployment, final docs | ⏳ Planned |

*Status will be updated as features are implemented.*

---

## Learning Takeaways

By building this project by hand, you'll gain practical understanding of:

- **MERN Stack** – How frontend, backend, and DB connect end-to-end
- **Real-Time Communication** – WebSockets, Socket.IO rooms, events, presence
- **Authentication** – JWTs, Clerk integration, token verification, webhooks
- **File Handling** – Multipart uploads, Multer, validation, memory vs disk
- **Cloud Media** – ImageKit, CDN, transformations
- **Middleware Patterns** – Auth, error handling, upload processing
- **Background Jobs** – Cron scheduling, maintenance tasks
- **Event-Driven Architecture** – Webhooks vs polling
- **TypeScript End-to-End** – Type safety across client/server
- **Modern UI/UX** – Theming, responsiveness, accessibility
- **Documentation-First** – Writing docs that explain architecture & concepts
- **Deployment** – Free hosting, env config, CORS, production readiness

---

## Troubleshooting

For common issues (ports, CORS, Socket.IO, Clerk, uploads, deployment), see **[docs/TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)**.

---

## License

This project is licensed under the **MIT License**. See the [LICENSE](./LICENSE) file for details (to be added if needed).

---

**Built with ❤️ for learning.** 

*This project follows a documentation-first approach. All implementation will be hand-coded, with docs kept in sync as features evolve.*