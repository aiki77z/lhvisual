#!/usr/bin/env bash

set -euo pipefail

LHVISUAL_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SUBMISSION_ENV_FILE="${SUBMISSION_ENV_FILE:-$LHVISUAL_ROOT/.env.submission}"
SUBMISSION_RUNTIME_DIR="$LHVISUAL_ROOT/runtime"
SUBMISSION_PID_DIR="$SUBMISSION_RUNTIME_DIR/pids"
SUBMISSION_LOG_DIR="$SUBMISSION_RUNTIME_DIR/logs"
SUBMISSION_SYSTEMD_UNIT_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
SUBMISSION_SYSTEMD_API_UNIT="lhvisual-submission-api.service"
SUBMISSION_SYSTEMD_WORKER_UNIT="lhvisual-submission-worker.service"

load_submission_env() {
  if [[ ! -f "$SUBMISSION_ENV_FILE" ]]; then
    echo "Missing env file: $SUBMISSION_ENV_FILE" >&2
    echo "Copy .env.submission.example to .env.submission and fill in real values." >&2
    exit 1
  fi
  set -a
  # shellcheck disable=SC1090
  source "$SUBMISSION_ENV_FILE"
  set +a
}

ensure_runtime_dirs() {
  mkdir -p "$SUBMISSION_RUNTIME_DIR" "$SUBMISSION_PID_DIR" "$SUBMISSION_LOG_DIR"
}

pid_is_running() {
  local pid="$1"
  [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null
}

python_bin() {
  echo "$LHVISUAL_ROOT/.venv-submission/bin/python"
}

systemd_user_available() {
  systemctl --user show-environment >/dev/null 2>&1
}

submission_systemd_api_unit_path() {
  echo "$SUBMISSION_SYSTEMD_UNIT_DIR/$SUBMISSION_SYSTEMD_API_UNIT"
}

submission_systemd_worker_unit_path() {
  echo "$SUBMISSION_SYSTEMD_UNIT_DIR/$SUBMISSION_SYSTEMD_WORKER_UNIT"
}

submission_systemd_installed() {
  [[ -f "$(submission_systemd_api_unit_path)" ]]
}

systemd_unit_state() {
  local unit="$1"
  systemctl --user is-active "$unit" 2>/dev/null || true
}

systemd_unit_main_pid() {
  local unit="$1"
  systemctl --user show --property MainPID --value "$unit" 2>/dev/null || true
}
