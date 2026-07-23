#!/usr/bin/env bash

set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

load_submission_env
ensure_runtime_dirs

SOURCE_REPO="${LOOPSBENCH_SOURCE_REPO:-${LHB_SOURCE_REPO:-}}"

if [[ -z "$SOURCE_REPO" ]]; then
  echo "LOOPSBENCH_SOURCE_REPO is required in $SUBMISSION_ENV_FILE" >&2
  exit 1
fi

if [[ -z "${SUBMISSION_TARGET_REPO_CLONE_URL:-}" ]]; then
  echo "SUBMISSION_TARGET_REPO_CLONE_URL is required in $SUBMISSION_ENV_FILE" >&2
  exit 1
fi

TARGET_DIR="$SUBMISSION_TARGET_REPO_CLONE_URL"
mkdir -p "$TARGET_DIR"
rm -rf "$TARGET_DIR/long_horizon_bench"

rsync -a --delete \
  --exclude ".git/" \
  --exclude "__pycache__/" \
  --exclude ".pytest_cache/" \
  "$SOURCE_REPO/pyproject.toml" \
  "$SOURCE_REPO/README.md" \
  "$SOURCE_REPO/registry.json" \
  "$SOURCE_REPO/scripts" \
  "$SOURCE_REPO/loopsbench" \
  "$TARGET_DIR/"

mkdir -p "$TARGET_DIR/tasks"

if [[ ! -d "$TARGET_DIR/.git" ]]; then
  git -C "$TARGET_DIR" init -b main
  git -C "$TARGET_DIR" config user.name "LoopsBench Local Mirror"
  git -C "$TARGET_DIR" config user.email "loopsbench-local@example.com"
fi

git -C "$TARGET_DIR" add .
if ! git -C "$TARGET_DIR" diff --cached --quiet; then
  git -C "$TARGET_DIR" commit -m "sync local benchmark snapshot"
fi

echo "Synced local benchmark repo to $TARGET_DIR"
