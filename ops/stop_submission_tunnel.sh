#!/usr/bin/env bash

set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

ensure_runtime_dirs

PID_FILE="$SUBMISSION_PID_DIR/submission-tunnel.pid"
if [[ -f "$PID_FILE" ]] && pid_is_running "$(cat "$PID_FILE")"; then
  kill "$(cat "$PID_FILE")"
fi
rm -f "$PID_FILE"

echo "Stopped submission tunnel"
