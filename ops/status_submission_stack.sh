#!/usr/bin/env bash

set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

load_submission_env
ensure_runtime_dirs

if submission_systemd_installed; then
  API_STATE="$(systemd_unit_state "$SUBMISSION_SYSTEMD_API_UNIT")"
  API_PID="$(systemd_unit_main_pid "$SUBMISSION_SYSTEMD_API_UNIT")"
  if [[ "$API_STATE" == "active" ]]; then
    echo "submission-api: running via systemd (pid ${API_PID:-unknown})"
  else
    echo "submission-api: ${API_STATE:-stopped} via systemd"
  fi

  if [[ "${SUBMISSION_PROCESS_INLINE:-false}" == "false" ]]; then
    WORKER_STATE="$(systemd_unit_state "$SUBMISSION_SYSTEMD_WORKER_UNIT")"
    WORKER_PID="$(systemd_unit_main_pid "$SUBMISSION_SYSTEMD_WORKER_UNIT")"
    if [[ "$WORKER_STATE" == "active" ]]; then
      echo "submission-worker: running via systemd (pid ${WORKER_PID:-unknown})"
    else
      echo "submission-worker: ${WORKER_STATE:-stopped} via systemd"
    fi
  fi

  curl -fsS "http://${SUBMISSION_API_HOST:-127.0.0.1}:${SUBMISSION_API_PORT:-8011}/api/v1/healthz" || true
  exit 0
fi

API_PID_FILE="$SUBMISSION_PID_DIR/submission-api.pid"
WORKER_PID_FILE="$SUBMISSION_PID_DIR/submission-worker.pid"

if [[ -f "$API_PID_FILE" ]] && pid_is_running "$(cat "$API_PID_FILE")"; then
  echo "submission-api: running (pid $(cat "$API_PID_FILE"))"
else
  echo "submission-api: stopped"
fi

if [[ "${SUBMISSION_PROCESS_INLINE:-false}" == "false" ]]; then
  if [[ -f "$WORKER_PID_FILE" ]] && pid_is_running "$(cat "$WORKER_PID_FILE")"; then
    echo "submission-worker: running (pid $(cat "$WORKER_PID_FILE"))"
  else
    echo "submission-worker: stopped"
  fi
fi

curl -fsS "http://${SUBMISSION_API_HOST:-127.0.0.1}:${SUBMISSION_API_PORT:-8011}/api/v1/healthz" || true
