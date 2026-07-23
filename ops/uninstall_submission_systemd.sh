#!/usr/bin/env bash

set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

if ! systemd_user_available; then
  echo "systemd --user is not available for this account." >&2
  exit 1
fi

systemctl --user disable --now "$SUBMISSION_SYSTEMD_API_UNIT" >/dev/null 2>&1 || true
systemctl --user disable --now "$SUBMISSION_SYSTEMD_WORKER_UNIT" >/dev/null 2>&1 || true
rm -f "$(submission_systemd_api_unit_path)" "$(submission_systemd_worker_unit_path)"
systemctl --user daemon-reload

echo "Removed systemd user services for the submission stack"
