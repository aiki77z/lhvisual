#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

SITE_ROOT="${SITE_ROOT:-/var/www/lhvisual/current}"
VITE_BASE_PATH="${VITE_BASE_PATH:-/}"
NPM_CMD="${NPM_CMD:-npm}"
INSTALL_DEPS="${INSTALL_DEPS:-1}"
BUILD_SITE="${BUILD_SITE:-1}"
SYNC_SITE="${SYNC_SITE:-1}"
DELETE_EXTRA_FILES="${DELETE_EXTRA_FILES:-1}"
RELOAD_NGINX="${RELOAD_NGINX:-0}"
USE_SUDO="${USE_SUDO:-auto}"

usage() {
  cat <<'USAGE'
Builds the Vite site and syncs dist/ into the configured Nginx web root.

Environment variables:
  SITE_ROOT=/var/www/lhvisual/current
      Destination directory served by Nginx.

  VITE_BASE_PATH=/
      Vite base path. Keep "/" when the site is bound to the domain root.

  NPM_CMD=npm
      Package manager command used for install/build.

  INSTALL_DEPS=1
      Run "npm ci" before building. Set to 0 to skip dependency install.

  BUILD_SITE=1
      Run the production build. Set to 0 to reuse an existing dist/ folder.

  SYNC_SITE=1
      Sync dist/ into SITE_ROOT with rsync. Set to 0 to build only.

  DELETE_EXTRA_FILES=1
      Pass --delete to rsync so removed files disappear from SITE_ROOT too.

  RELOAD_NGINX=0
      When set to 1, run "nginx -t" and "systemctl reload nginx" after sync.

  USE_SUDO=auto
      auto: use sudo only when the target path or nginx reload needs it.
      1: always use sudo for filesystem and nginx operations when not root.
      0: never use sudo.

Examples:
  ./deploy/deploy-static.sh
  SITE_ROOT=/var/www/loopsbench/current ./deploy/deploy-static.sh
  INSTALL_DEPS=0 RELOAD_NGINX=1 ./deploy/deploy-static.sh
USAGE
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf 'Missing required command: %s\n' "$1" >&2
    exit 1
  fi
}

path_needs_sudo() {
  local path="$1"
  local probe="$path"

  if [[ -e "$probe" ]]; then
    [[ ! -w "$probe" ]]
    return
  fi

  probe="$(dirname "$probe")"
  while [[ ! -e "$probe" && "$probe" != "/" ]]; do
    probe="$(dirname "$probe")"
  done

  [[ ! -w "$probe" ]]
}

run_fs() {
  local path="$1"
  shift

  case "${USE_SUDO}" in
    0)
      "$@"
      ;;
    1)
      if [[ "${EUID}" -ne 0 ]]; then
        sudo "$@"
      else
        "$@"
      fi
      ;;
    auto)
      if [[ "${EUID}" -ne 0 ]] && path_needs_sudo "$path"; then
        sudo "$@"
      else
        "$@"
      fi
      ;;
    *)
      printf 'Invalid USE_SUDO value: %s\n' "${USE_SUDO}" >&2
      exit 1
      ;;
  esac
}

run_service() {
  case "${USE_SUDO}" in
    0)
      "$@"
      ;;
    1|auto)
      if [[ "${EUID}" -ne 0 ]]; then
        sudo "$@"
      else
        "$@"
      fi
      ;;
    *)
      printf 'Invalid USE_SUDO value: %s\n' "${USE_SUDO}" >&2
      exit 1
      ;;
  esac
}

require_command "${NPM_CMD}"
require_command rsync

cd "${REPO_DIR}"

printf 'Repository: %s\n' "${REPO_DIR}"
printf 'Site root:  %s\n' "${SITE_ROOT}"
printf 'Base path:  %s\n' "${VITE_BASE_PATH}"

if [[ "${INSTALL_DEPS}" == "1" ]]; then
  "${NPM_CMD}" ci
fi

if [[ "${BUILD_SITE}" == "1" ]]; then
  VITE_BASE_PATH="${VITE_BASE_PATH}" "${NPM_CMD}" run build
fi

if [[ "${SYNC_SITE}" == "1" ]]; then
  if [[ ! -d dist ]]; then
    printf 'Build output not found: %s/dist\n' "${REPO_DIR}" >&2
    exit 1
  fi

  rsync_flags=(-av)
  if [[ "${DELETE_EXTRA_FILES}" == "1" ]]; then
    rsync_flags+=(--delete)
  fi

  run_fs "${SITE_ROOT}" mkdir -p "${SITE_ROOT}"
  run_fs "${SITE_ROOT}" rsync "${rsync_flags[@]}" dist/ "${SITE_ROOT}/"
fi

if [[ "${RELOAD_NGINX}" == "1" ]]; then
  require_command nginx
  require_command systemctl
  run_service nginx -t
  run_service systemctl reload nginx
fi

printf 'Deployment finished.\n'
