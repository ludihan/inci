import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { DATA_DIR } from "./data-dir";

export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");

const IMAGE_MAX_SIZE = 5 * 1024 * 1024;

export const MAX_IMAGES_PER_MESSAGE = 5;

const IMAGE_MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

// Uploads are images only. The union is kept because legacy rows created before
// this change may still carry kind "video", and those attachments keep rendering.
export type AttachmentKind = "image" | "video";

export type SaveImageResult =
  | { ok: true; path: string }
  | { ok: false; error: string };

export async function saveImage(file: File | null): Promise<SaveImageResult> {
  if (!file || file.size === 0) {
    return { ok: false, error: "required" };
  }
  const ext = IMAGE_MIME_TO_EXT[file.type];
  if (!ext) {
    return { ok: false, error: "invalid-type" };
  }
  if (file.size > IMAGE_MAX_SIZE) {
    return { ok: false, error: "too-large" };
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const name = `${randomUUID()}.${ext}`;
  await mkdir(UPLOADS_DIR, { recursive: true });
  await writeFile(path.join(UPLOADS_DIR, name), buffer);
  return { ok: true, path: `/uploads/${name}` };
}

export type SaveAttachmentResult =
  | { ok: true; path: string }
  | { ok: false; error: string };

export async function saveAttachment(
  file: File
): Promise<SaveAttachmentResult> {
  if (file.size === 0) {
    return { ok: false, error: "required" };
  }
  const ext = IMAGE_MIME_TO_EXT[file.type];
  if (!ext) {
    return { ok: false, error: "invalid-type" };
  }
  if (file.size > IMAGE_MAX_SIZE) {
    return { ok: false, error: "too-large" };
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const name = `${randomUUID()}.${ext}`;
  await mkdir(UPLOADS_DIR, { recursive: true });
  await writeFile(path.join(UPLOADS_DIR, name), buffer);
  return { ok: true, path: `/uploads/${name}` };
}

const SIGNATURE_MAX_SIZE = 512 * 1024;
const DATA_URL_PNG = /^data:image\/png;base64,([a-zA-Z0-9+/]+=*)$/;

export async function saveSignature(dataUrl: string): Promise<string | null> {
  const match = DATA_URL_PNG.exec(dataUrl.trim());
  if (!match) return null;
  const buffer = Buffer.from(match[1], "base64");
  if (buffer.length === 0 || buffer.length > SIGNATURE_MAX_SIZE) return null;
  const name = `${randomUUID()}.png`;
  await mkdir(UPLOADS_DIR, { recursive: true });
  await writeFile(path.join(UPLOADS_DIR, name), buffer);
  return `/uploads/${name}`;
}

export async function deleteImage(photoPath?: string): Promise<void> {
  if (!photoPath) return;
  const name = path.basename(photoPath);
  if (!/^[a-f0-9-]+\.(jpg|png|webp|gif|mp4|webm|mov)$/i.test(name)) return;
  try {
    await unlink(path.join(UPLOADS_DIR, name));
  } catch {
    // ignore missing files
  }
}
