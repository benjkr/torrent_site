#!/usr/bin/env bash
# Non-blocking local dev: qBittorrent (Docker) + bun run dev
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

COMPOSE_FILE="$ROOT/docker-compose.dev.yml"
DEV_DIR="$ROOT/.dev"
LOG_DIR="$DEV_DIR/logs"
QB_CONFIG_DIR="$DEV_DIR/qbittorrent/config/qBittorrent"
QB_DOWNLOADS_DIR="$DEV_DIR/qbittorrent/downloads"
SEED_CONF="$ROOT/docker/qbittorrent/qBittorrent.conf"
PID_FILE="$DEV_DIR/dev.pid"
LOG_FILE="$LOG_DIR/dev.log"

usage() {
  echo "Usage: $0 {up|down}" >&2
  exit 1
}

is_pid_alive() {
  local pid="$1"
  [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null
}

seed_qb_config() {
  mkdir -p "$QB_CONFIG_DIR" "$QB_DOWNLOADS_DIR" "$LOG_DIR"
  local dest="$QB_CONFIG_DIR/qBittorrent.conf"
  if [[ ! -f "$dest" ]]; then
    if [[ ! -f "$SEED_CONF" ]]; then
      echo "error: seeded config missing: $SEED_CONF" >&2
      exit 1
    fi
    cp "$SEED_CONF" "$dest"
    echo "Seeded qBittorrent config → $dest"
  fi
}

compose() {
  docker compose -f "$COMPOSE_FILE" "$@"
}

cmd_up() {
  seed_qb_config

  if compose ps --status running --services 2>/dev/null | grep -qx qbittorrent; then
    echo "qBittorrent already running"
  else
    echo "Starting qBittorrent..."
    compose up -d
  fi

  if [[ -f "$PID_FILE" ]]; then
    existing_pid="$(tr -d '[:space:]' <"$PID_FILE" || true)"
    if is_pid_alive "$existing_pid"; then
      echo "App already running (pid $existing_pid)"
    else
      rm -f "$PID_FILE"
      start_app
    fi
  else
    start_app
  fi

  echo
  echo "Dev environment is up (non-blocking)."
  echo "  qBittorrent WebUI: http://127.0.0.1:8080  (admin / Password123)"
  echo "  App:               http://127.0.0.1:3000"
  echo "  App log:           $LOG_FILE"
  echo "  Stop with:         $0 down"
}

start_app() {
  mkdir -p "$LOG_DIR"
  echo "Starting bun run dev..."
  # New session so down can signal the whole process group (Vite + maindata-ws).
  setsid bun run dev >>"$LOG_FILE" 2>&1 < /dev/null &
  echo $! >"$PID_FILE"
  echo "App started (pid $(cat "$PID_FILE")) → $LOG_FILE"
}

stop_app() {
  if [[ ! -f "$PID_FILE" ]]; then
    echo "App not running (no PID file)"
    return 0
  fi

  local pid
  pid="$(tr -d '[:space:]' <"$PID_FILE" || true)"
  if ! is_pid_alive "$pid"; then
    echo "App not running (stale PID $pid)"
    rm -f "$PID_FILE"
    return 0
  fi

  echo "Stopping app (pid $pid)..."
  # Kill the process group started by setsid (negative PID).
  kill -TERM -- "-$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null || true

  local i=0
  while is_pid_alive "$pid" && [[ $i -lt 20 ]]; do
    sleep 0.25
    i=$((i + 1))
  done

  if is_pid_alive "$pid"; then
    echo "App did not exit; sending SIGKILL..."
    kill -KILL -- "-$pid" 2>/dev/null || kill -KILL "$pid" 2>/dev/null || true
  fi

  rm -f "$PID_FILE"
  echo "App stopped"
}

cmd_down() {
  stop_app
  echo "Stopping qBittorrent..."
  compose down
  echo "Dev environment is down."
}

if [[ $# -ne 1 ]]; then
  usage
fi

case "$1" in
  up) cmd_up ;;
  down) cmd_down ;;
  *) usage ;;
esac
