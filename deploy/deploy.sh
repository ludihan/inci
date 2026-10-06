#!/usr/bin/env bash
#
# Rolls the inci stack on this server to a given image tag, waits for the
# container healthcheck, and rolls back to the previous tag if it fails.
# Run from the deploy directory (the Jenkinsfile does this over SSH):
#
#   ./deploy.sh <tag>

set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

NEW_TAG="${1:?usage: deploy.sh <tag>}"
if ! [[ "$NEW_TAG" =~ ^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$ ]]; then
  echo "error: invalid image tag: $NEW_TAG" >&2
  exit 1
fi

if [ ! -f .env ]; then
  echo "error: .env not found in $PWD (copy .env.example and fill it in)" >&2
  exit 1
fi
chmod 600 .env

PREV_TAG="$(sed -n 's/^INCI_TAG=//p' .env | tail -n1)"

set_tag() {
  if grep -q '^INCI_TAG=' .env; then
    sed -i "s/^INCI_TAG=.*/INCI_TAG=$1/" .env
  else
    echo "INCI_TAG=$1" >> .env
  fi
}

wait_healthy() {
  local id status
  id="$(docker compose ps -q app)"
  for _ in $(seq 1 30); do
    status="$(docker inspect --format '{{.State.Health.Status}}' "$id" 2>/dev/null || echo missing)"
    [ "$status" = "healthy" ] && return 0
    [ "$status" = "unhealthy" ] && return 1
    sleep 4
  done
  return 1
}

echo "==> Deploying inci $NEW_TAG (previous: ${PREV_TAG:-none})"
set_tag "$NEW_TAG"
docker compose pull app
docker compose up -d --remove-orphans

if wait_healthy; then
  echo "==> inci $NEW_TAG is healthy"
  docker image prune -f >/dev/null
  exit 0
fi

echo "error: inci $NEW_TAG failed its healthcheck" >&2
docker compose logs --tail=100 app >&2 || true

if [ -n "$PREV_TAG" ] && [ "$PREV_TAG" != "$NEW_TAG" ]; then
  echo "==> Rolling back to $PREV_TAG" >&2
  set_tag "$PREV_TAG"
  docker compose up -d --remove-orphans
  wait_healthy && echo "==> Rolled back to $PREV_TAG" >&2
fi
exit 1
