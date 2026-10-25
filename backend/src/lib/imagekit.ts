import ImageKit, { toFile } from "@imagekit/nodejs";
import { IMAGEKIT_PRIVATE_KEY } from "../constants/env";

const imagekit = new ImageKit({ privateKey: IMAGEKIT_PRIVATE_KEY });

// originalName: "My Photo (1).png"
// result: "chat-1749300000000-My_Photo__1_.png"
// this helper makes a safe, unique filename for uploaded files.
function createFileName(originalName = "upload") {
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `chat-${Date.now()}-${safeName}`;
}

async function uploadChatMedia(file: {
  buffer: Buffer;
  originalName: string;
  mimetype: string;
}) {
  const fileName = createFileName(file.originalName);
  const result = await imagekit.files.upload({
    file: await toFile(file.buffer, fileName, { type: file.mimetype }),
    fileName,
    folder: "/chat",
  });

  if (!result.url) {
    throw new Error("ImageKit upload did not return a URL");
  }

  return result.url;
}

export default uploadChatMedia;
