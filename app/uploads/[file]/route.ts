import { readFile } from "fs/promises";
import path from "path";
import { UPLOADS_DIR } from "@/lib/uploads";

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> }
) {
  const { file } = await params;

  if (!/^[a-f0-9-]+\.(jpg|jpeg|png|webp|gif)$/i.test(file)) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const buffer = await readFile(path.join(UPLOADS_DIR, file));
    const ext = file.split(".").pop()?.toLowerCase() ?? "";
    return new Response(buffer, {
      headers: {
        "Content-Type": MIME_BY_EXT[ext] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
