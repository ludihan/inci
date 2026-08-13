import { open, readFile, stat } from "fs/promises";
import path from "path";
import { UPLOADS_DIR } from "@/lib/uploads";

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ file: string }> }
) {
  const { file } = await params;

  if (!/^[a-f0-9-]+\.(jpg|jpeg|png|webp|gif|mp4|webm|mov)$/i.test(file)) {
    return new Response("Not found", { status: 404 });
  }

  const filePath = path.join(UPLOADS_DIR, file);
  const ext = file.split(".").pop()?.toLowerCase() ?? "";
  const contentType = MIME_BY_EXT[ext] ?? "application/octet-stream";

  let stats;
  try {
    stats = await stat(filePath);
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const range = request.headers.get("range");
  if (range) {
    const match = /bytes=(\d+)-(\d*)/.exec(range);
    if (match) {
      const start = Number(match[1]);
      const end = match[2] ? Math.min(Number(match[2]), stats.size - 1) : stats.size - 1;
      if (start >= 0 && start <= end && end < stats.size) {
        const chunkSize = end - start + 1;
        const fh = await open(filePath, "r");
        try {
          const buffer = Buffer.alloc(chunkSize);
          await fh.read(buffer, 0, chunkSize, start);
          return new Response(buffer, {
            status: 206,
            headers: {
              "Content-Range": `bytes ${start}-${end}/${stats.size}`,
              "Accept-Ranges": "bytes",
              "Content-Length": String(chunkSize),
              "Content-Type": contentType,
            },
          });
        } finally {
          await fh.close();
        }
      }
    }
  }

  try {
    const buffer = await readFile(filePath);
    return new Response(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(stats.size),
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
