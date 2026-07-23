#!/usr/bin/env bash

set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

load_submission_env
ensure_runtime_dirs

if submission_systemd_installed; then
  systemctl --user stop "$SUBMISSION_SYSTEMD_API_UNIT" >/dev/null 2>&1 || true
  if [[ "${SUBMISSION_PROCESS_INLINE:-false}" == "false" ]]; then
    systemctl --user stop "$SUBMISSION_SYSTEMD_WORKER_UNIT" >/dev/null 2>&1 || true
  fi
  rm -f "$SUBMISSION_PID_DIR/submission-api.pid" "$SUBMISSION_PID_DIR/submission-worker.pid"
  echo "Stopped submission stack via systemd user services"
  exit 0
fi

for name in submission-worker submission-api; do
  PID_FILE="$SUBMISSION_PID_DIR/$name.pid"
  if [[ ! -f "$PID_FILE" ]]; then
    continue
  fi
  PID="$(cat "$PID_FILE")"
  if pid_is_running "$PID"; then
    kill "$PID"
  fi
  rm -f "$PID_FILE"
done

echo "Stopped submission stack"
