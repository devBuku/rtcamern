# Media Handling (File Uploads from Scratch + ImageKit)

This document explains how media (images and videos) are handled in **rtcamern**. It covers two key parts:
1. **File uploads from scratch** using [Multer](https://github.com/expressjs/multer) – configuration, validation, storage, limits, and error handling.
2. **ImageKit integration** for hosting, URL generation, and on-the-fly transformations.

The goal is to understand the full media flow and the reasoning behind each choice (learning-focused).

---

## Overview

Media sharing is a core feature: users can attach images/videos to messages. The flow is:

1. **Client** selects file(s) and prepares multipart/form-data.
2. **Backend upload endpoint** receives file via **Multer middleware** (parses/validates).
3. **Validation** checks file type (MIME), size limits, etc. ("from scratch" implementation).
4. **Upload to ImageKit** from backend (server-side) using buffer/stream.
5. **Get URLs & metadata** from ImageKit (main URL, thumbnail, fileId, key).
6. **Store in DB** on `Message.image` or `Message.video`.
7. **Send/display** in chat UI via returned URLs.

---

## 1. File Uploads From Scratch (Multer)

"File uploads from scratch" means we explicitly configure Multer rather than using a black-box service. We write and understand:
- Storage strategy (memory vs disk)
- File filter (MIME/type validation)
- Size limits
- Error handling
- How `req.file`/`req.files` are populated

This demonstrates how multipart uploads work in Express.

### Why Multer?

Multer is a standard middleware for handling `multipart/form-data`. It parses files and text fields, making it easy to access uploaded content. By configuring it ourselves, we learn the tradeoffs.

### Storage: Memory vs Disk

| Aspect | `multer.memoryStorage()` | `multer.diskStorage()` |
|---|---|---|
| **Where files go** | Stored in RAM as `Buffer` | Saved to local filesystem at specified `destination` |
| **Pros** | No disk I/O, faster for direct cloud uploads; easy to stream/upload buffer to ImageKit. No temp file cleanup needed if uploaded immediately. | Files persist on disk; good if you need to process them locally or keep backups. |
| **Cons** | Limited by available RAM; large uploads can consume memory. Not suitable for very large files without streaming. | Requires managing temp files (cleanup), disk space concerns. |
| **Choice** | **Memory storage** – upload buffer directly to ImageKit. This avoids writing temp files and is clean for this project. |

**Learning point:** Explain this choice in code comments.

### File Filter (Validation)

We must validate file types on the server. Never trust `Content-Type` from client alone, but MIME type check is a good first line.

**Allowed types:**

| Category | MIME Types | Notes |
|---|---|---|
| **Images** | `image/jpeg`, `image/jpg`, `image/png`, `image/webp`, `image/gif`, `image/avif` | Common web-safe formats |
| **Videos** | `video/mp4`, `video/webm`, `video/quicktime` (mov), `video/ogg` | Reasonable for chat uploads |

**File filter implementation (conceptual):**
- Check `file.mimetype` against allowlist.
- If allowed, `cb(null, true)`.
- If not, `cb(new Error('Unsupported file type'), false)` and let error middleware handle it.

**Learning point:** This is a key security/UX check. Can be extended with magic number checks later, but MIME is sufficient for learning.

### Size Limits

Prevent abuse and resource exhaustion.

| Item | Limit | Rationale |
|---|---|---|
| **Single file size** | `25 MB` (`MAX_FILE_SIZE` in `backend/src/constants/env.ts`) | Balance UX with free-tier limits (ImageKit, hosting, RAM). Oversized files return `413`. |
| **Files per request** | `1` — routes call `upload.single("media")` | One media attachment per message. |

These are enforced via `multer({ storage, fileFilter, limits: { fileSize: MAX_FILE_SIZE } })`.

### Multer Configuration

Location: `backend/src/middlewares/upload.middleware.ts` (note the plural `middlewares/` directory).

```ts
import multer from "multer";
import { MAX_FILE_SIZE } from "../constants/env";
import { BAD_REQUEST } from "../constants/http-status";

const allowedTypes = new Set([
  "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif", "image/avif",
  "video/mp4", "video/webm", "video/quicktime", "video/ogg",
]);

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE }, // 25 MB
  fileFilter: (_req, file, cb) => {
    if (!allowedTypes.has(file.mimetype)) {
      cb(Object.assign(
        new Error("Unsupported file type. Only images and videos are allowed."),
        { status: BAD_REQUEST },
      ));
      return;
    }
    cb(null, true);
  },
});
```

**Notes:**
- Field name is `"media"` and routes call `upload.single("media")`.
- The filter uses an explicit MIME allowlist (not `image/*`) so SVG and other formats are rejected.
- `MAX_FILE_SIZE` is `25 * 1024 * 1024` in `backend/src/constants/env.ts`.
- Rejections carry a `status` so `backend/src/middlewares/error.middleware.ts` can return JSON `400`/`413` instead of Express's HTML 500 page.

### Error Handling

Multer throws errors like `MulterError` with codes: `LIMIT_FILE_SIZE`, `LIMIT_FILE_COUNT`, `LIMIT_UNEXPECTED_FILE`, etc. These should be caught and converted to user-friendly messages in the error middleware or upload route.

Example mapping:
- `LIMIT_FILE_SIZE` → "File too large. Maximum size is 50MB."
- `LIMIT_FILE_COUNT` → "Too many files. Maximum 5 files allowed."
- `LIMIT_UNEXPECTED_FILE` → "Unexpected file field."

This improves UX while keeping errors consistent.

---

## 2. ImageKit Integration

[ImageKit](https://imagekit.io/) is used for media hosting, CDN delivery, and on-the-fly transformations. It's free tier friendly and easy to integrate.

### Why ImageKit?

- **Free tier** – aligns with "100% Free Tools".
- **Transformations** – resize, crop, optimize images/videos on-the-fly (e.g., thumbnails).
- **CDN delivery** – faster loading for users.
- **SDK for Node.js** – simple server-side upload from buffer/stream.
- **URL-based transformations** – no extra processing on our server.
- **Secure** – private key stays on backend only.

### Setup Requirements

From ImageKit dashboard:
- **Private Key** – `IMAGEKIT_PRIVATE_KEY` (backend only, never exposed)
- **URL Endpoint** – `IMAGEKIT_URL_ENDPOINT` (e.g., `https://ik.imagekit.io/your_imagekit_id/`)
- **ImageKit ID** – `IMAGEKIT_ID`

This project does not use an `IMAGEKIT_PUBLIC_KEY`; the installed `@imagekit/nodejs` SDK only needs the private key for server-side uploads.

See [`ENV.md`](./ENV.md) for env var details.

### SDK Initialization

Location: `backend/src/lib/imagekit.ts`

```ts
import ImageKit, { toFile } from "@imagekit/nodejs";
import { IMAGEKIT_PRIVATE_KEY } from "../constants/env";

const imagekit = new ImageKit({ privateKey: IMAGEKIT_PRIVATE_KEY });
```

The installed `@imagekit/nodejs` SDK only needs the private key. `IMAGEKIT_URL_ENDPOINT` and `IMAGEKIT_ID` are validated at startup but not used by the upload path yet.

### Uploading from Buffer (Memory Storage)

Since we use `multer.memoryStorage()`, the file is available as `req.file.buffer` with `req.file.originalname`, `req.file.mimetype`, `req.file.size`.

Upload to ImageKit using the SDK's `files.upload()` + `toFile()`:

```ts
// backend/src/lib/imagekit.ts
const result = await imagekit.files.upload({
  file: await toFile(file.buffer, fileName, { type: file.mimetype }),
  fileName, // safe, unique name from createFileName()
  folder: "/chat",
});

if (!result.url) throw new Error("ImageKit upload did not return a URL");
return result.url; // stored on Message.image or Message.video
```

`createFileName()` sanitizes the original name and prefixes it with `chat-<timestamp>-` so uploads are unique and URL-safe.

**Return values from ImageKit:**
- `url` – Main accessible URL
- `thumbnailUrl` – Can be generated via transformation URL (or ImageKit may provide; we can construct)
- `fileId` – Unique ImageKit file ID
- `filePath` / `name` / `key` – File identifiers
- `size`, `mimeType`, `height`, `width` – Metadata

### Generating Thumbnails/Transformations

ImageKit supports URL transformations. For images, common thumbnail: `tr:w-300,h-300,c-at_max,q-80`

Example:
```text
Original: https://ik.imagekit.io/id/file.jpg
Thumbnail: https://ik.imagekit.io/id/tr:w-300,h-300,c-at_max,q-80/file.jpg
```

For videos, ImageKit can generate video thumbnails too (if enabled), but for simplicity we can use image transformations where applicable or just return main URL. Learning note: document the transformation approach.

We can construct thumbnail URL programmatically:
```ts
const thumbnailUrl = uploadResult.url.includes('?')
  ? uploadResult.url
  : `${uploadResult.url}?tr=w-300,h-300,c-at_max,q-80`; // or better use path-based
// Or use ImageKit's URL builder if needed
```

But better to use path-based transformation or the SDK's URL generation. For learning, constructing is fine to understand transformations.

### Upload Flow (Implemented)

Media upload is **not** a standalone endpoint. It happens inside `POST /api/messages/send/:id`:

**Route:** `POST /api/messages/send/:id` (see [`API.md`](./API.md))
**Middleware:** `authMiddleware` (router-level) + `upload.single("media")`

**Controller logic (`message.controller.ts`):**
1. Validate `:id` and require at least one of `text` or `req.file`.
2. If `req.file` exists, call `uploadChatMedia({ buffer, originalName, mimetype })`.
3. Store the returned URL on `Message.image` (images) or `Message.video` (videos).
4. Save and return the created message document.

**Example response (201 Created):**
```json
{
  "_id": "...",
  "senderId": "...",
  "receiverId": "...",
  "text": "Hey, check this out!",
  "image": "https://ik.imagekit.io/.../chat-...-image.jpg",
  "video": null,
  "createdAt": "...",
  "updatedAt": "..."
}
```

### Error Handling

- **Multer errors:** `backend/src/middlewares/error.middleware.ts` maps `LIMIT_FILE_SIZE` to `413` and other Multer errors / rejected MIME types to `400` JSON.
- **ImageKit errors:** `uploadChatMedia` throws; the controller's `try/catch` logs and returns `500 { message: "Internal Server Error" }`. A missing `url` in the SDK response is also treated as an error.
- **Missing content:** If neither `text` nor `media` is provided, the controller returns `400 { message: "Message must contain text or media" }`.

---

## 3. Media in Messages (Database)

The current `Message` model stores a single media URL per message in one of two fields (see [`DATABASE.md`](./DATABASE.md)):

| Field | Type | Description |
|---|---|---|
| `image` | `String` | URL of an uploaded image, or `null`. |
| `video` | `String` | URL of an uploaded video, or `null`. |

The controller decides based on the upload's MIME type (`video/*` → `video`, otherwise `image`). Thumbnails and ImageKit metadata (`fileId`, `size`, etc.) are not persisted yet; only the returned URL is stored.

**Why store the URL?**
- Display in the chat UI without re-uploading.
- Keeps the message document small.
- The richer `media[]` object design is still a future goal.

---

## 4. Security Considerations (Learning Focus)

- **Server-side validation:** Always validate on backend (MIME + size). Client checks are UX only.
- **Private key protection:** `IMAGEKIT_PRIVATE_KEY` must never reach frontend. Only used in backend SDK.
- **Filename sanitization:** `createFileName()` strips unsafe characters and adds a timestamp prefix; ImageKit also de-duplicates names by default.
- **Restrict file types:** Only allow images/videos to reduce attack surface.
- **Size limits:** Prevent DoS via large uploads.
- **CORS:** Ensure upload endpoint respects CORS rules (frontend origin only).
- **Auth required:** Upload endpoint must be protected (auth middleware) to prevent anonymous uploads.

---

## 5. Local Development Notes

- **No local storage of media:** With memory storage + ImageKit, we don't keep files on disk after upload—clean.
- **ImageKit free tier limits:** Usually fine for learning (generous enough for dev/testing).
- **Testing uploads:** Use small test images/videos. Postman/curl or frontend form.
- **Network errors:** Handle timeouts if needed (ImageKit API calls).

---

## 6. Media Flow Diagram (Current)

```text
Client (select file)
  ↓ multipart/form-data
POST /api/messages/send/:id (Auth + Multer)
  ↓ Multer parses & validates (type, size)
  ↓ req.file.buffer
uploadChatMedia() -> imagekit.files.upload(toFile(buffer, ...))
  ↓ returns result.url
Controller stores URL on Message.image or Message.video
  ↓ saves document and returns it
Client displays using message.image / message.video
```

This reflects the current implementation. A Mermaid diagram may be added later.

---

## 7. Implementation Checklist

- [x] Add ImageKit env vars to `.env.example` and constants (`IMAGEKIT_PRIVATE_KEY`, `IMAGEKIT_URL_ENDPOINT`, `IMAGEKIT_ID`)
- [x] Create `backend/src/lib/imagekit.ts` with SDK init (`new ImageKit({ privateKey })`) and `uploadChatMedia`
- [x] Create `backend/src/middlewares/upload.middleware.ts` (note the plural `middlewares/` directory)
- [x] Integrate upload into `POST /api/messages/send/:id` (no separate upload controller/route)
- [x] Register the messages router in `index.ts`
- [x] Add error handling for Multer (`backend/src/middlewares/error.middleware.ts`)
- [x] Store media URLs on `Message.image` / `Message.video`
- [ ] Manual end-to-end test with real ImageKit credentials

---

## Related Documentation

- [`MIDDLEWARE.md`](./MIDDLEWARE.md) – Upload middleware deep-dive
- [`API.md`](./API.md) – Messages API
- [`DATABASE.md`](./DATABASE.md) – Message model
- [`ENV.md`](./ENV.md) – ImageKit env vars
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) – Media flow in system
- [`UI.md`](./UI.md) – Media UI (previews, thumbnails)

---

*Last updated: Reflects the implemented message-attached upload flow (Multer + `@imagekit/nodejs`).*