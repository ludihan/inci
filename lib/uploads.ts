import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { DATA_DIR } from "./data-dir";

export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");

const MAX_SIZE = 5 * 1024 * 1024;

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export type SaveImageResult =
  | { ok: true; path: string }
  | { ok: false; error: string };

export async function saveImage(file: File | null): Promise<SaveImageResult> {
  if (!file || file.size === 0) {
    return { ok: false, error: "required" };
  }
  const ext = MIME_TO_EXT[file.type];
  if (!ext) {
    return { ok: false, error: "invalid-type" };
  }
  if (file.size > MAX_SIZE) {
    return { ok: false, error: "too-large" };
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const name = `${randomUUID()}.${ext}`;
  await mkdir(UPLOADS_DIR, { recursive: true });
  await writeFile(path.join(UPLOADS_DIR, name), buffer);
  return { ok: true, path: `/uploads/${name}` };
}

export async function deleteImage(photoPath?: string): Promise<void> {
  if (!photoPath) return;
  const name = path.basename(photoPath);
  if (!/^[a-f0-9-]+\.(jpg|png|webp|gif)$/i.test(name)) return;
  try {
    await unlink(path.join(UPLOADS_DIR, name));
  } catch {
    // ignore missing files
  }
}
