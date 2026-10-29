#!/usr/bin/env bash
# Build the current git-tag image on the remote host's Docker daemon (over
# SSH, no registry), then replace container "torrent_site" there.
#
# App env comes from .env.production.
#
# Usage: ./publish.sh <host> <user>
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

ENV_FILE="$ROOT/.env.production"
IMAGE_REPO="torrent_site"
CONTAINER_NAME="torrent_site"

usage() {
  echo "Usage: $0 <host> <user>" >&2
  exit 1
}

if [[ $# -ne 2 ]]; then
  usage
fi

HOST="$1"
REMOTE_USER="$2"

if [[ -z "$HOST" || -z "$REMOTE_USER" ]]; then
  usage
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "error: missing $ENV_FILE (copy from .env.production.example)" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

: "${QB_BASE_URL:?error: QB_BASE_URL must be set in .env.production}"
: "${QB_USERNAME:?error: QB_USERNAME must be set in .env.production}"
: "${QB_DOWNLOADS_HOST_PATH:?error: QB_DOWNLOADS_HOST_PATH must be set in .env.production (host path of qB downloads volume)}"
QB_PASSWORD="${QB_PASSWORD:-}"
LIBRARY_FILES_ROOT="${LIBRARY_FILES_ROOT:-/downloads}"
LIBRARY_FILES_QB_PREFIX="${LIBRARY_FILES_QB_PREFIX:-/downloads}"

if ! TAG="$(git describe --tags --exact-match HEAD 2>/dev/null)"; then
  echo "error: HEAD is not exactly on a git tag (tag the commit first)" >&2
  exit 1
fi

COMMIT="$(git rev-parse --short HEAD)"
IMAGE="${IMAGE_REPO}:${TAG}"

echo "Publishing ${IMAGE} (commit ${COMMIT})"
echo "Deploy target: ${REMOTE_USER}@${HOST}"

# Build straight on the server so the image never leaves it.
docker -H "ssh://${REMOTE_USER}@${HOST}" build \
  --build-arg "VITE_APP_TAG=${TAG}" \
  --build-arg "VITE_APP_COMMIT=${COMMIT}" \
  -t "$IMAGE" \
  .

REMOTE_CMD="$(printf \
  'IMAGE=%q CONTAINER_NAME=%q QB_BASE_URL=%q QB_USERNAME=%q QB_PASSWORD=%q LIBRARY_FILES_ROOT=%q LIBRARY_FILES_QB_PREFIX=%q QB_DOWNLOADS_HOST_PATH=%q bash -s' \
  "$IMAGE" \
  "$CONTAINER_NAME" \
  "$QB_BASE_URL" \
  "$QB_USERNAME" \
  "$QB_PASSWORD" \
  "$LIBRARY_FILES_ROOT" \
  "$LIBRARY_FILES_QB_PREFIX" \
  "$QB_DOWNLOADS_HOST_PATH")"

# shellcheck disable=SC2029
ssh "${REMOTE_USER}@${HOST}" "$REMOTE_CMD" <<'REMOTE'
set -euo pipefail

if docker inspect "$CONTAINER_NAME" >/dev/null 2>&1; then
  docker stop "$CONTAINER_NAME"
  docker rm "$CONTAINER_NAME"
fi

if [[ ! -d "$QB_DOWNLOADS_HOST_PATH" ]]; then
  echo "error: QB_DOWNLOADS_HOST_PATH does not exist on server: $QB_DOWNLOADS_HOST_PATH" >&2
  exit 1
fi

# Bind-mount the same host downloads dir qB uses → /downloads in this container.
docker run -d \
  --name "$CONTAINER_NAME" \
  --restart unless-stopped \
  -p 3000:3000 \
  -v "${QB_DOWNLOADS_HOST_PATH}:/downloads:ro" \
  -e NODE_ENV=production \
  -e "QB_BASE_URL=${QB_BASE_URL}" \
  -e "QB_USERNAME=${QB_USERNAME}" \
  -e "QB_PASSWORD=${QB_PASSWORD}" \
  -e "LIBRARY_FILES_ROOT=${LIBRARY_FILES_ROOT}" \
  -e "LIBRARY_FILES_QB_PREFIX=${LIBRARY_FILES_QB_PREFIX}" \
  "$IMAGE"

echo "Deployed ${IMAGE} as container ${CONTAINER_NAME}"
echo "Mounted ${QB_DOWNLOADS_HOST_PATH} → /downloads (ro)"
REMOTE

echo "Done."
