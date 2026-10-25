import multer from "multer";
import { MAX_FILE_SIZE } from "../constants/env";
import { BAD_REQUEST } from "../constants/http-status";

// Explicit allowlist: `image/*` would also accept SVG and other formats we
// don't want to serve. Keep this in sync with docs/MEDIA.md.
const allowedTypes = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/ogg",
]);

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (!allowedTypes.has(file.mimetype)) {
      // Attach a status so the error handler can return a JSON 400 instead of
      // letting Express fall back to its HTML 500 page.
      cb(
        Object.assign(
          new Error(
            "Unsupported file type. Only images and videos are allowed.",
          ),
          { status: BAD_REQUEST },
        ),
      );
      return;
    }
    cb(null, true);
  },
});
