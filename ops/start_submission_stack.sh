#!/usr/bin/env bash

set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

load_submission_env
ensure_runtime_dirs

if submission_systemd_installed; then
  systemctl --user start "$SUBMISSION_SYSTEMD_API_UNIT"
  if [[ "${SUBMISSION_PROCESS_INLINE:-false}" == "false" ]]; then
    systemctl --user start "$SUBMISSION_SYSTEMD_WORKER_UNIT"
  fi

  HEALTH_URL="http://${SUBMISSION_API_HOST:-127.0.0.1}:${SUBMISSION_API_PORT:-8011}/api/v1/healthz"
  for _ in $(seq 1 60); do
    if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done

  if ! curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
    echo "submission-api failed to become ready via systemd" >&2
    systemctl --user status "$SUBMISSION_SYSTEMD_API_UNIT" --no-pager || true
    exit 1
  fi

  echo "Started submission stack via systemd user services"
  exit 0
fi

PYTHON_BIN="$(python_bin)"
if [[ ! -x "$PYTHON_BIN" ]]; then
  echo "Missing virtualenv at $PYTHON_BIN" >&2
  echo "Run ops/setup_submission_env.sh first." >&2
  exit 1
fi

if [[ -n "${SUBMISSION_TARGET_REPO_CLONE_URL:-}" && ! -e "${SUBMISSION_TARGET_REPO_CLONE_URL}" ]]; then
  echo "Target repo clone URL path does not exist: ${SUBMISSION_TARGET_REPO_CLONE_URL}" >&2
  echo "If you are using a local benchmark snapshot, run ops/sync_local_target_repo.sh first." >&2
  exit 1
fi

API_PID_FILE="$SUBMISSION_PID_DIR/submission-api.pid"
WORKER_PID_FILE="$SUBMISSION_PID_DIR/submission-worker.pid"
API_LOG="$SUBMISSION_LOG_DIR/submission-api.log"
WORKER_LOG="$SUBMISSION_LOG_DIR/submission-worker.log"
HEALTH_URL="http://${SUBMISSION_API_HOST:-127.0.0.1}:${SUBMISSION_API_PORT:-8011}/api/v1/healthz"

if [[ -f "$API_PID_FILE" ]] && pid_is_running "$(cat "$API_PID_FILE")"; then
  echo "submission-api already running with pid $(cat "$API_PID_FILE")"
  exit 1
fi

if [[ -f "$WORKER_PID_FILE" ]] && pid_is_running "$(cat "$WORKER_PID_FILE")"; then
  echo "submission-worker already running with pid $(cat "$WORKER_PID_FILE")"
  exit 1
fi

nohup "$PYTHON_BIN" -m uvicorn submission_service.app.main:app \
  --host "${SUBMISSION_API_HOST:-127.0.0.1}" \
  --port "${SUBMISSION_API_PORT:-8011}" \
  >"$API_LOG" 2>&1 &
echo $! > "$API_PID_FILE"

if [[ "${SUBMISSION_PROCESS_INLINE:-false}" == "false" ]]; then
  nohup "$PYTHON_BIN" -m submission_service.app.worker \
    >"$WORKER_LOG" 2>&1 &
  echo $! > "$WORKER_PID_FILE"
fi

for _ in $(seq 1 60); do
  if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
  echo "submission-api failed to become ready" >&2
  tail -n 80 "$API_LOG" >&2 || true
  exit 1
fi

if [[ "${SUBMISSION_PROCESS_INLINE:-false}" == "false" ]]; then
  if [[ ! -f "$WORKER_PID_FILE" ]] || ! pid_is_running "$(cat "$WORKER_PID_FILE")"; then
    echo "submission-worker failed to stay running" >&2
    tail -n 80 "$WORKER_LOG" >&2 || true
    exit 1
  fi
fi

echo "Started submission API on ${SUBMISSION_API_HOST:-127.0.0.1}:${SUBMISSION_API_PORT:-8011}"
