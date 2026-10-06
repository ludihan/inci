# syntax=docker/dockerfile:1.7
#
# Production image for inci (Next.js standalone output + node:sqlite).
#
#   docker build -t inci .
#   docker build --target lint .     # lint only (used by the Jenkinsfile)
#
# NEXT_PUBLIC_* flags are inlined into the bundle at build time, so they are
# build args here rather than runtime env vars.

ARG NODE_IMAGE=node:24-alpine

# ---- deps: install exactly what package-lock.json pins ----------------------
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# --ignore-scripts: no dependency gets to run arbitrary code at install time
# (sharp ships prebuilt binaries as optional packages, nothing needs a build).
RUN --mount=type=cache,target=/root/.npm \
    npm ci --ignore-scripts --no-audit --no-fund

# ---- lint -------------------------------------------------------------------
FROM deps AS lint
COPY . .
RUN npm run lint

# ---- builder ----------------------------------------------------------------
FROM deps AS builder
ARG NEXT_PUBLIC_DISABLE_COMPLAINTS=false
ARG NEXT_PUBLIC_DISABLE_IT_TICKETS=false
ARG NEXT_PUBLIC_DISABLE_MAINTENANCE_TICKETS=false
ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PUBLIC_DISABLE_COMPLAINTS=${NEXT_PUBLIC_DISABLE_COMPLAINTS} \
    NEXT_PUBLIC_DISABLE_IT_TICKETS=${NEXT_PUBLIC_DISABLE_IT_TICKETS} \
    NEXT_PUBLIC_DISABLE_MAINTENANCE_TICKETS=${NEXT_PUBLIC_DISABLE_MAINTENANCE_TICKETS}
COPY . .
# Copy the static assets into the standalone output, and never ship local
# data or secrets even if they slipped into the build context.
RUN npm run build \
 && cp -r public .next/standalone/public \
 && mkdir -p .next/standalone/.next \
 && cp -r .next/static .next/standalone/.next/static \
 && rm -rf .next/standalone/data .next/standalone/inci-db .next/standalone/.env*

# ---- runner -----------------------------------------------------------------
FROM ${NODE_IMAGE} AS runner

# The runtime only needs `node`: drop the package managers (and their
# bundled dependencies) to shrink the attack surface, and pick up security
# fixes for the base packages.
RUN apk upgrade --no-cache \
 && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
           /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
           /opt/yarn* /usr/local/bin/yarn /usr/local/bin/yarnpkg

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

WORKDIR /app

# lib/data-dir.ts puts the database and uploads in ../inci-db in production,
# i.e. /inci-db for WORKDIR /app. It is the only writable path the app needs
# besides the Next.js cache (tmpfs in docker-compose.yml).
RUN mkdir -p /inci-db /app/.next/cache \
 && chown node:node /inci-db /app/.next/cache

# Application files are owned by root and read-only for the runtime user, so
# a compromised process cannot rewrite the server code.
COPY --from=builder --chown=root:root /app/.next/standalone ./

USER node
VOLUME ["/inci-db"]
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT}/api/health" || exit 1

# Exec form, so node receives SIGTERM directly on `docker stop`.
CMD ["node", "server.js"]
