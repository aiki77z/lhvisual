#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV_DIR="$ROOT/.venv-submission"

python3 -m venv "$VENV_DIR"
"$VENV_DIR/bin/pip" install --upgrade pip
"$VENV_DIR/bin/pip" install -e "$ROOT/submission_service[dev,runner]"

echo "Created submission backend env at $VENV_DIR"
