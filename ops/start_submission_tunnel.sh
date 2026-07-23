#!/usr/bin/env bash

set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

load_submission_env
ensure_runtime_dirs

TUNNEL_PID_FILE="$SUBMISSION_PID_DIR/submission-tunnel.pid"
TUNNEL_LOG="$SUBMISSION_LOG_DIR/submission-tunnel.log"

if [[ -f "$TUNNEL_PID_FILE" ]] && pid_is_running "$(cat "$TUNNEL_PID_FILE")"; then
  echo "submission tunnel already running with pid $(cat "$TUNNEL_PID_FILE")"
  exit 1
fi

nohup cloudflared tunnel --no-autoupdate \
  --url "http://${SUBMISSION_API_HOST:-127.0.0.1}:${SUBMISSION_API_PORT:-8011}" \
  >"$TUNNEL_LOG" 2>&1 &
echo $! > "$TUNNEL_PID_FILE"

echo "Started cloudflared quick tunnel. URL will appear in $TUNNEL_LOG"
