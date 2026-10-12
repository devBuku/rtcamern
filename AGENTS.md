# AGENTS.md

This document serves as a guide for AI agents (like this one) assisting with the **rtcamern** (Real-Time Chat Application using MERN Stack) project. Since this is a learning project that you'll be coding by hand, this file outlines the agent's role, responsibilities, and workflows.

---

## 1. Project Overview

- **Name:** rtcamern
- **Description:** Real-Time Chat Application built with MERN stack + Socket.IO
- **Goal:** A learning-focused, resume-ready, production-style project
- **Approach:** Hand-coded by the user. Agents should not scaffold or rewrite large portions of the codebase unless explicitly requested.

---

## 2. Agent Role

The agent's primary role is to act as a **Documentation + UI Polish Assistant**.

### Core Responsibilities

- **UI Polishes (Later Stages):** Suggest small, meaningful improvements to layout, spacing, typography, colors, themes, responsiveness, accessibility, and UX to make the project stand out.
- **Documentation Maintenance:** Keep all documentation accurate, up-to-date, and in sync with the code you write.
- **Learning-Focused Guidance:** Explain concepts in plain language, focusing on the "why" behind implementations.
- **Non-Intrusive:** Avoid unsolicited full-file rewrites. Suggestions should be concrete, actionable, and preserve your hand-written learning approach.

### What Agents Should NOT Do

- Scaffold the entire project from scratch (you'll be coding by hand).
- Make large, sweeping changes without your explicit approval.
- Delete or overwrite unfamiliar files without investigation.
- Assume implementation details—only document what actually exists in the codebase.
- Over-comment trivial code. Focus on explaining logic, decisions, and concepts.

---

## 3. Documentation Strategy

All documentation should be maintained to help both you (future-you) and others understand the architecture, design decisions, and setup process.

### A. Inline Code Documentation

| Location | What to Document | Style |
|---|---|---|
| **Top of each file** | Purpose, functionality, and how it fits into the architecture | Short 1–3 line block comment |
| **Functions/Handlers** | What it does, inputs, outputs, and important side effects | Concise JSDoc-style (optional params/returns) |
| **Complex Logic (Sockets, Middleware, Uploads)** | The "why" behind the implementation (rooms, auth, presence, Multer, validation, etc.) | Line-level explanatory comments |
| **Config Files** | Explain each environment variable/config value and when to change it | Inline comments |

**Guideline:** Explain reasoning without over-commenting. Prioritize clarity for learning purposes.

### B. Project-Wide Documentation (`/docs/` Folder)

Create and maintain a `docs/` directory with the following files as the project progresses:

| File | Purpose | Notes |
|---|---|---|
| **`docs/ARCHITECTURE.md`** | High-level system architecture | Include **Mermaid diagrams** (data flow, DB relations, message flow, client-server, realtime flow). |
| **`docs/SETUP.md`** | Step-by-step local setup guide | Cover prerequisites, cloning, installation, `.env` setup, running client+server, common issues. |
| **`docs/ENV.md`** | Environment variables reference | Explain every variable (Clerk, MongoDB, ImageKit, ports, client URLs), where to get them, and safe defaults. |
| **`docs/DATABASE.md`** | Database schema and design | Document User, Conversation, Message models, fields, relationships, indexes, and reasoning behind design. |
| **`docs/AUTH.md`** | Authentication flow | Cover Clerk (frontend + backend), token verification, user sync, protected routes, and webhooks. |
| **`docs/API.md`** | REST API reference | List all endpoints with methods, auth requirements, request/response examples, and purpose. |
| **`docs/SOCKETS.md`** | Socket.IO events and realtime flow | Document event names, payloads, rooms, emits/broadcasts, presence, typing, read receipts. Explain the custom WebSocket server. |
| **`docs/MEDIA.md`** | Media handling | Explain **file uploads from scratch** (Multer: storage vs memory, validation, limits, MIME checks) and **ImageKit** (uploads, URLs, transformations). |
| **`docs/MIDDLEWARE.md`** | Middleware deep-dive | Document auth, error, and upload middleware with execution order and detailed explanations. |
| **`docs/WEBHOOKS_CRON.md`** | Webhooks & Cron Jobs | Explain webhooks (use cases, flow, security), cron jobs (schedules, demos, testing locally), and how they integrate. |
| **`docs/UI.md`** | UI/UX, theming, and personalization | Cover Dark/Light mode, multiple themes, wallpapers, keyboard sound effects, design tokens, spacing, accessibility, and responsiveness strategy. |
| **`docs/DEPLOYMENT.md`** | Free deployment guide | Cover Netlify/Vercel (frontend), Railway/Render (backend), MongoDB Atlas, env config, CORS, Socket.IO client URL, live testing, troubleshooting. |
| **`docs/TROUBLESHOOTING.md`** | Common issues and fixes | Address CORS, Socket.IO, ports, uploads, Clerk, ImageKit, and other dev issues. |

### C. Comprehensive README.md

The `README.md` should be written for first-time visitors and serve as the entry point, linking to deep dives in `/docs/`. It should include the following sections:

| Section | Details |
|---|---|
| **Project Title + Tagline** | What it is and its learning focus |
| **Live Demo** | Placeholder until deployed |
| **Features** | Map to all highlights (auth, realtime, presence, media, themes, wallpapers, sounds, uploads from scratch, ImageKit, webhooks, cron, middleware, custom WS server, deploy, etc.) |
| **Tech Stack** | List technologies with short rationale for each |
| **Table of Contents** | Easy navigation |
| **Architecture Overview** | High-level summary with a link to `docs/ARCHITECTURE.md` |
| **Folder Structure** | Explain what lives where and why |
| **Prerequisites** | Node.js, MongoDB Atlas, Clerk account, ImageKit account (all free) |
| **Getting Started (Local Setup)** | Clean, copy-pasteable steps, with link to `docs/SETUP.md` for deeper details |
| **Environment Variables** | `.env.example` reference with explanation, link to `docs/ENV.md` |
| **Core Concepts** | Brief explanations + links (Auth, Realtime, Media, Middleware, Webhooks, Cron) |
| **API Reference** | Summary + link to `docs/API.md` |
| **Socket.IO Events** | Summary + link to `docs/SOCKETS.md` |
| **Database Models** | Overview + link to `docs/DATABASE.md` |
| **Theming, Wallpapers & Sounds** | Overview + link to `docs/UI.md` |
| **Deployment** | Free deployment summary + link to `docs/DEPLOYMENT.md` |
| **Scripts** | Client/server run commands |
| **Project Roadmap/Phases** | Learning-oriented breakdown |
| **Learning Takeaways** | What someone learns by building this project |
| **Troubleshooting** | Quick links + link to `docs/TROUBLESHOOTING.md` |
| **License** | MIT (recommended) |

**Markdown Guidelines:** Use GitHub-Flavored Markdown, clear tables, code blocks, callouts, and **Mermaid diagrams** wherever they help explain flows.

---

## 4. UI Polish Guidelines

When reviewing hand-written UI code, suggest targeted improvements grouped by impact. Focus on subtle, meaningful polishes rather than redesigns.

| Area | Suggested Polishes | Goal |
|---|---|---|
| **Layout & Spacing** | Consistent spacing scale, padding/margins, flex/grid alignment, whitespace | Cleaner, more professional look |
| **Typography** | Font sizes, weights, line-height, letter-spacing, chat readability | Improved readability |
| **Colors & Themes** | Hero UI theme tokens, dark/light consistency, semantic colors (success/error/info), contrast/accessibility | Polished & accessible |
| **Chat UI** | Message bubbles, alignment, timestamps, avatars, read receipts, typing indicator, last message preview, scroll behavior | Standout real-time chat feel |
| **Media UI** | Image/video previews, thumbnails, loading states, graceful fallbacks | Smooth media sharing UX |
| **States** | Loading skeletons, empty states, error states, disabled states | Production-grade feel |
| **Microinteractions** | Hover, active, transitions, focus rings, send button feedback | Polished without being flashy |
| **Responsiveness** | Mobile-first, sidebar/chat layout on small screens, safe areas | Works across devices |
| **Themes/Wallpapers/Sounds UX** | Clear toggles, previews, persistent preferences, respect user choices | Smooth personalization |
| **Accessibility (a11y)** | Focus management, aria labels, color contrast, keyboard navigation | Inclusive, solid UX |

**Approach:** Provide specific, actionable suggestions (e.g., Tailwind/Hero UI class names, small before/after snippets, or explanations of changes). Let the user implement them to preserve the learning experience.

---

## 5. Workflow & Communication

1. **Share at Stages:** As you progress (e.g., Auth, Sockets, Media, first UI pass), share key files/folders for review.
2. **Polish Pass:** For each stage, suggest UI improvements and identify any missing or unclear documentation for the files shared.
3. **Docs Sync:** When files are updated, suggest updates to inline comments and relevant `.md` files in `/docs/` to keep everything accurate.
4. **No Unsolicited Rewrites:** Suggestions should explain the "why" and be optional to implement.
5. **Ask for Clarification:** If implementation details are unclear, ask rather than assume.
6. **Keep README as Source of Truth:** Expand it progressively as features land, linking to deep dives in `/docs/`.

---

## 6. Key Learning Concepts to Document

Ensure these are well-explained throughout the codebase and docs:

- **Custom WebSocket Server:** Socket.IO setup from scratch (no Firebase/Supabase), rooms, events, presence.
- **Authentication:** Clerk integration (frontend + backend), JWT verification, protected routes, user sync.
- **File Uploads from Scratch:** Multer configuration, memory vs disk storage, validation, size limits, MIME type checks, error handling.
- **Media with ImageKit:** Uploading, obtaining URLs, applying transformations, storing in database.
- **Middleware:** Auth middleware, error middleware, upload middleware, with order of execution explained.
- **Webhooks:** What they are, use cases, flow, security considerations, and Clerk webhook integration.
- **Cron Jobs:** Purpose, scheduling, practical demos (e.g., cleanup of orphaned temp files), and how to test.
- **Realtime Features:** Messaging, typing indicators, online presence, read receipts.
- **Theming & Personalization:** Dark/Light mode, multiple themes, wallpapers, keyboard sound effects.

---

## 7. Final Notes

- This is a learning project—prioritize understanding over shortcuts.
- Documentation should be thorough enough that someone new to these concepts can follow along and understand the architecture.
- UI polishes should enhance, not overpower. Keep it clean, professional, and accessible.
- All changes should respect the existing codebase structure, naming conventions, and style.
- When in doubt, ask for clarification before making assumptions!