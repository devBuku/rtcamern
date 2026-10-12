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
6. **Store in DB** as part of `Message.media` array.
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
| **Planned Choice** | **Memory storage** – upload buffer directly to ImageKit. This avoids writing temp files and is clean for this project. |

**Learning point:** Explain this choice in code comments.

### File Filter (Validation)

We must validate file types on the server. Never trust `Content-Type` from client alone, but MIME type check is a good first line.

**Planned allowed types:**

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

| Item | Planned Limit | Rationale |
|---|---|---|
| **Single file size** | e.g., `10MB` for images, `25–50MB` for videos | Balance UX with free-tier limits (ImageKit, hosting, RAM). Final value decided in implementation. |
| **Multiple files** | e.g., max 5 files per upload request | Keep messages manageable. |

These are enforced via `multer({ limits: { fileSize: 50 * 1024 * 1024, files: 5 } })`.

### Multer Configuration (Planned)

Location: `backend/src/middleware/upload.middleware.ts`

```ts
import multer from "multer";
import { BadRequestError } from "../utils/errors"; // custom error

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedImage = ["image/jpeg","image/jpg","image/png","image/webp","image/gif","image/avif"];
  const allowedVideo = ["video/mp4","video/webm","video/quicktime","video/ogg"];
  const allowed = [...allowedImage, ...allowedVideo];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new BadRequestError("Unsupported file type. Only images/videos allowed."), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 5
  }
});

export const uploadSingle = upload.single("media");
export const uploadMultiple = upload.array("media", 5);
```

**Notes:**
- Field name `"media"` matches API contract (`API.md`).
- Custom `BadRequestError` ensures consistent error shape via error middleware.
- Add detailed comments explaining each choice.

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
- **Public Key** – `IMAGEKIT_PUBLIC_KEY`
- **Private Key** – `IMAGEKIT_PRIVATE_KEY` (backend only, never exposed)
- **URL Endpoint** – `IMAGEKIT_URL_ENDPOINT` (e.g., `https://ik.imagekit.io/your_imagekit_id/`)

See [`ENV.md`](./ENV.md) for env var details.

### SDK Initialization (Planned)

Location: `backend/src/lib/imagekit.ts`

```ts
import ImageKit from "imagekit";
import { IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, IMAGEKIT_URL_ENDPOINT } from "../constants/env";

const imagekit = new ImageKit({
  publicKey: IMAGEKIT_PUBLIC_KEY,
  privateKey: IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: IMAGEKIT_URL_ENDPOINT
});

export default imagekit;
```

Also add env constants in `backend/src/constants/env.ts` as implemented.

### Uploading from Buffer (Memory Storage)

Since we use `multer.memoryStorage()`, the file is available as `req.file.buffer` with `req.file.originalname`, `req.file.mimetype`, `req.file.size`.

Upload to ImageKit using `imagekit.upload()`:

```ts
const uploadResult = await imagekit.upload({
  file: req.file.buffer, // Buffer
  fileName: req.file.originalname, // Original filename
  folder: "/rtcamern/uploads", // Organize files (optional but nice)
  useUniqueFileName: true, // Avoid name collisions
  tags: ["chat", "user-upload"] // Optional tags for management
});
```

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

### Upload Endpoint Implementation (Planned)

**Route:** `POST /api/upload` (see [`API.md`](./API.md))
**Middleware:** `authMiddleware` + `uploadSingle`

**Controller logic:**
1. Check `req.file` exists (if not, throw BadRequestError).
2. Upload to ImageKit with above config.
3. Build `media` object with required fields.
4. Return `{ success: true, media }` to client.

**Example response:**
```json
{
  "success": true,
  "media": {
    "url": uploadResult.url,
    "thumbnailUrl": thumbnailUrl,
    "type": req.file.mimetype.startsWith('video') ? 'video' : 'image',
    "fileId": uploadResult.fileId,
    "key": uploadResult.filePath || uploadResult.name,
    "size": uploadResult.size,
    "mimeType": uploadResult.mimeType
  }
}
```

### Error Handling

- **Multer errors:** Caught by error middleware (invalid type, too large).
- **ImageKit errors:** Catch and pass to error middleware (auth failure, quota, network). Return 500 or appropriate message.
- **Missing file:** If no file after validation, `BadRequestError("No file uploaded")`.

---

## 3. Media in Messages (Database)

Media references are stored in `Message.media` array as objects (see [`DATABASE.md`](./DATABASE.md)).

Each attachment stores:
- `url`, `thumbnailUrl`
- `type` ('image'|'video')
- `fileId`, `key` (ImageKit refs)
- `size`, `mimeType`

**Why store these?**
- Display in UI without re-uploading.
- Can reference for future operations (e.g., delete from ImageKit if message deleted—optional).
- Thumbnails improve chat list/previews performance.
- Type helps render correct element (`<img>` vs `<video>`).

---

## 4. Security Considerations (Learning Focus)

- **Server-side validation:** Always validate on backend (MIME + size). Client checks are UX only.
- **Private key protection:** `IMAGEKIT_PRIVATE_KEY` must never reach frontend. Only used in backend SDK.
- **Filename sanitization:** `useUniqueFileName: true` prevents collisions and path issues.
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

## 6. Media Flow Diagram (Conceptual)

```text
Client (select file)
  ↓ multipart/form-data
POST /api/upload (Auth + Multer)
  ↓ Multer parses & validates (type, size)
  ↓ req.file.buffer
ImageKit.upload(buffer, filename, opts)
  ↓ returns uploadResult + URLs
Controller builds media object
  ↓ returns to client
Client embeds media in message (POST /api/messages or socket)
  ↓ stored in Message.media
Client displays using media.url/thumbnailUrl
```

This matches the planned architecture. A full Mermaid diagram will be added to [`ARCHITECTURE.md`](./ARCHITECTURE.md) when implemented.

---

## 7. Implementation Checklist (For Hand-Coded Dev)

- [ ] Add ImageKit env vars to `.env.example` and constants
- [ ] Create `backend/src/lib/imagekit.ts` with SDK init + comments
- [ ] Create `backend/src/middleware/upload.middleware.ts` with Multer config (explain choices)
- [ ] Create upload controller in `backend/src/controllers/upload.controller.ts`
- [ ] Create upload route in `backend/src/routes/upload.route.ts` (auth + upload middleware)
- [ ] Register route in `index.ts` with correct order
- [ ] Test with small files (image + video)
- [ ] Add error handling for Multer + ImageKit errors
- [ ] Update `Message` model media schema if needed (matches design)
- [ ] Document any deviations from this plan inline

---

## Related Documentation

- [`MIDDLEWARE.md`](./MIDDLEWARE.md) – Upload middleware deep-dive
- [`API.md`](./API.md) – Upload endpoint
- [`DATABASE.md`](./DATABASE.md) – Message.media structure
- [`ENV.md`](./ENV.md) – ImageKit env vars
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) – Media flow in system
- [`UI.md`](./UI.md) – Media UI (previews, thumbnails)

---

*Last updated: Initial media handling design (Multer from scratch + ImageKit). Will be refined as implemented.*