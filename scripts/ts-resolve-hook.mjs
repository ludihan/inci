// Resolve hook: add CommonJS-style extension / index resolution for relative
// imports, so the seed scripts can pull in `../lib/store.ts` and have that
// file's own `./db`, `./events`, ... imports resolve under Node's type stripper.
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const EXTS = [".ts", ".tsx", ".mjs", ".js", ".json"];
const INDEXES = ["/index.ts", "/index.tsx", "/index.js"];

export async function resolve(specifier, context, next) {
  const relative = specifier.startsWith("./") || specifier.startsWith("../");
  const hasExt = /\.[a-zA-Z0-9]+$/.test(specifier);
  if (relative && !hasExt && context.parentURL) {
    const basePath = fileURLToPath(new URL(specifier, context.parentURL));
    for (const ext of EXTS) {
      if (existsSync(basePath + ext)) return next(specifier + ext, context);
    }
    for (const idx of INDEXES) {
      if (existsSync(basePath + idx)) return next(specifier + idx, context);
    }
  }
  return next(specifier, context);
}
