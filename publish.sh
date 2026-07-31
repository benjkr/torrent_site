#!/usr/bin/env bash
# Build/push the current git-tag image to GHCR, then replace container
# "torrent_site" on the remote host via SSH.
#
# Authenticates to ghcr.io with GH_TOKEN from .env.production (locally and
# on the server for private package pulls). App env also comes from that file.
#
# Usage: ./publish.sh <host> <user>
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

ENV_FILE="$ROOT/.env.production"
IMAGE_REPO="ghcr.io/benjkr/torrent_site"
GHCR_USER="${IMAGE_REPO#ghcr.io/}"
GHCR_USER="${GHCR_USER%%/*}"
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
: "${GH_TOKEN:?error: GH_TOKEN must be set in .env.production}"
QB_PASSWORD="${QB_PASSWORD:-}"

if ! TAG="$(git describe --tags --exact-match HEAD 2>/dev/null)"; then
  echo "error: HEAD is not exactly on a git tag (tag the commit first)" >&2
  exit 1
fi

COMMIT="$(git rev-parse --short HEAD)"
IMAGE="${IMAGE_REPO}:${TAG}"

echo "Publishing ${IMAGE} (commit ${COMMIT})"
echo "Deploy target: ${REMOTE_USER}@${HOST}"

echo "$GH_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin

docker build \
  --build-arg "VITE_APP_TAG=${TAG}" \
  --build-arg "VITE_APP_COMMIT=${COMMIT}" \
  -t "$IMAGE" \
  .

docker push "$IMAGE"

REMOTE_CMD="$(printf \
  'IMAGE=%q CONTAINER_NAME=%q GHCR_USER=%q GH_TOKEN=%q QB_BASE_URL=%q QB_USERNAME=%q QB_PASSWORD=%q bash -s' \
  "$IMAGE" \
  "$CONTAINER_NAME" \
  "$GHCR_USER" \
  "$GH_TOKEN" \
  "$QB_BASE_URL" \
  "$QB_USERNAME" \
  "$QB_PASSWORD")"

# shellcheck disable=SC2029
ssh "${REMOTE_USER}@${HOST}" "$REMOTE_CMD" <<'REMOTE'
set -euo pipefail

echo "$GH_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin

docker pull "$IMAGE"

if docker inspect "$CONTAINER_NAME" >/dev/null 2>&1; then
  docker stop "$CONTAINER_NAME"
  docker rm "$CONTAINER_NAME"
fi

docker run -d \
  --name "$CONTAINER_NAME" \
  --restart unless-stopped \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e "QB_BASE_URL=${QB_BASE_URL}" \
  -e "QB_USERNAME=${QB_USERNAME}" \
  -e "QB_PASSWORD=${QB_PASSWORD}" \
  "$IMAGE"

echo "Deployed ${IMAGE} as container ${CONTAINER_NAME}"
REMOTE

echo "Done."
