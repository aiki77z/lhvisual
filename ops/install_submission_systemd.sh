#!/usr/bin/env bash

set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

if ! systemd_user_available; then
  echo "systemd --user is not available for this account." >&2
  exit 1
fi

load_submission_env
ensure_runtime_dirs

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

mkdir -p "$SUBMISSION_SYSTEMD_UNIT_DIR"

PATH_VALUE="${PATH:-/usr/local/bin:/usr/bin:/bin}"
API_UNIT_PATH="$(submission_systemd_api_unit_path)"
WORKER_UNIT_PATH="$(submission_systemd_worker_unit_path)"
API_LOG="$SUBMISSION_LOG_DIR/submission-api.log"
WORKER_LOG="$SUBMISSION_LOG_DIR/submission-worker.log"
API_HOST="${SUBMISSION_API_HOST:-127.0.0.1}"
API_PORT="${SUBMISSION_API_PORT:-8011}"

cat >"$API_UNIT_PATH" <<EOF
[Unit]
Description=lhvisual submission API
After=network-online.target
Wants=network-online.target
ConditionPathExists=$SUBMISSION_ENV_FILE
ConditionPathExists=$PYTHON_BIN

[Service]
Type=simple
WorkingDirectory=$LHVISUAL_ROOT
Environment=PATH=$PATH_VALUE
Environment=PYTHONUNBUFFERED=1
EnvironmentFile=$SUBMISSION_ENV_FILE
ExecStartPre=/usr/bin/mkdir -p $SUBMISSION_RUNTIME_DIR $SUBMISSION_LOG_DIR $SUBMISSION_PID_DIR
ExecStart=$PYTHON_BIN -m uvicorn submission_service.app.main:app --host $API_HOST --port $API_PORT
Restart=always
RestartSec=3
StandardOutput=append:$API_LOG
StandardError=append:$API_LOG

[Install]
WantedBy=default.target
EOF

if [[ "${SUBMISSION_PROCESS_INLINE:-false}" == "false" ]]; then
  cat >"$WORKER_UNIT_PATH" <<EOF
[Unit]
Description=lhvisual submission worker
After=network-online.target
Wants=network-online.target
ConditionPathExists=$SUBMISSION_ENV_FILE
ConditionPathExists=$PYTHON_BIN

[Service]
Type=simple
WorkingDirectory=$LHVISUAL_ROOT
Environment=PATH=$PATH_VALUE
Environment=PYTHONUNBUFFERED=1
EnvironmentFile=$SUBMISSION_ENV_FILE
ExecStartPre=/usr/bin/mkdir -p $SUBMISSION_RUNTIME_DIR $SUBMISSION_LOG_DIR $SUBMISSION_PID_DIR
ExecStart=$PYTHON_BIN -m submission_service.app.worker
Restart=always
RestartSec=3
StandardOutput=append:$WORKER_LOG
StandardError=append:$WORKER_LOG

[Install]
WantedBy=default.target
EOF
else
  rm -f "$WORKER_UNIT_PATH"
fi

rm -f "$SUBMISSION_PID_DIR/submission-api.pid" "$SUBMISSION_PID_DIR/submission-worker.pid"

systemctl --user daemon-reload
systemctl --user enable --now "$SUBMISSION_SYSTEMD_API_UNIT"
if [[ "${SUBMISSION_PROCESS_INLINE:-false}" == "false" ]]; then
  systemctl --user enable --now "$SUBMISSION_SYSTEMD_WORKER_UNIT"
else
  systemctl --user disable --now "$SUBMISSION_SYSTEMD_WORKER_UNIT" >/dev/null 2>&1 || true
fi

HEALTH_URL="http://$API_HOST:$API_PORT/api/v1/healthz"
for _ in $(seq 1 60); do
  if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
  echo "submission-api failed to become ready" >&2
  systemctl --user status "$SUBMISSION_SYSTEMD_API_UNIT" --no-pager || true
  exit 1
fi

echo "Installed and started systemd user services:"
echo "  - $SUBMISSION_SYSTEMD_API_UNIT"
if [[ "${SUBMISSION_PROCESS_INLINE:-false}" == "false" ]]; then
  echo "  - $SUBMISSION_SYSTEMD_WORKER_UNIT"
fi
