#!/usr/bin/env bash
#
# cPanel deploy script for the inci Next.js app.
#
# Builds this Next.js app (output: 'standalone') and packages it into a zip
# ready to upload through cPanel's File Manager into an already-configured
# "Setup Node.js App" application root. node_modules is NOT included in the
# zip to keep it small — run "Run NPM Install" in cPanel's Node.js App UI
# after extracting.
#
# Usage:
#   ./deploy-cpanel.sh [output.zip]
#
# With no argument the zip is named after the app directory (e.g.
# inci.zip), overwriting any previous one so cPanel always gets a
# predictable filename to upload.
#
# After it finishes:
#   1. Upload the zip via cPanel File Manager into the app's root directory.
#   2. Extract it there. db.sqlite + uploaded files live in a sibling
#      "*-db/" folder one level ABOVE the app root, so extracting never
#      touches them.
#   3. In "Setup Node.js App":
#        - Node.js version is 24+ (these apps use node:sqlite).
#        - Application startup file is set to: server.js
#        - Any required env vars (e.g. SESSION_SECRET) are set there.
#        - Click "Run NPM Install" to install production dependencies.
#   4. Click "Restart" (or touch tmp/restart.txt) to reload the app.

set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

OUT_ZIP="${1:-$(basename "$PWD").zip}"
STANDALONE_DIR=".next/standalone"

if ! command -v zip >/dev/null 2>&1; then
  echo "error: 'zip' is not installed" >&2
  exit 1
fi

# The persisted-data folder name (inci-db) is read straight from
# lib/data-dir.ts so this script never drifts from the app config.
DATA_DIR_NAME="$(grep -oP '"\.\."\s*,\s*"\K[^"]+' lib/data-dir.ts || true)"
if [ -z "$DATA_DIR_NAME" ]; then
  echo "error: could not determine persisted-data folder name from lib/data-dir.ts" >&2
  exit 1
fi

echo "==> Installing dependencies (npm ci)"
npm ci

echo "==> Building production bundle (npm run build)"
rm -rf .next
npm run build

if [ ! -f "$STANDALONE_DIR/server.js" ]; then
  echo "error: $STANDALONE_DIR/server.js not found — check next.config.ts has output: 'standalone'" >&2
  exit 1
fi

echo "==> Copying static assets into standalone output"
rm -rf "$STANDALONE_DIR/public" "$STANDALONE_DIR/.next/static"
cp -r public "$STANDALONE_DIR/public"
mkdir -p "$STANDALONE_DIR/.next"
cp -r .next/static "$STANDALONE_DIR/.next/static"

# Guard against ever shipping local secrets or persisted data by accident.
rm -rf "$STANDALONE_DIR/data" "$STANDALONE_DIR/$DATA_DIR_NAME" "$STANDALONE_DIR/.env"

# Drop node_modules from the final zip — install deps on the server instead
# (cPanel's "Run NPM Install") to keep the upload small.
rm -rf "$STANDALONE_DIR/node_modules"

echo "==> Zipping $STANDALONE_DIR -> $OUT_ZIP"
rm -f "$OUT_ZIP"
(cd "$STANDALONE_DIR" && zip -rq "../../$OUT_ZIP" .)

echo
echo "Done: $OUT_ZIP"
echo
echo "Next steps on cPanel:"
echo "  1. Upload $OUT_ZIP via File Manager into the Node.js app's root directory."
echo "  2. Extract it there. db.sqlite + uploads live in $DATA_DIR_NAME/ one level"
echo "     above the app root and are re-created only if missing."
echo "  3. In 'Setup Node.js App': startup file = server.js, Node.js version 24+."
echo "  4. Click 'Run NPM Install' to install production dependencies."
echo "  5. Restart the application from the cPanel Node.js App UI."
