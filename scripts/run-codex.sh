#!/usr/bin/env bash

set -euo pipefail

CODEX_IDENTITY="${CODEX_IDENTITY:-corporate-1}"
export CODEX_IDENTITY
export PATH="${HOME}/.agents/bin:$PATH"
export CODEX_HOME="${HOME}/.codex-${CODEX_IDENTITY}"

project_from_args() {
  local project="$PWD"
  while [ "$#" -gt 0 ]; do
    case "$1" in
      --cd|--cwd|-C)
        if [ "$#" -gt 1 ]; then
          project="$2"
          shift 2
          continue
        fi
        ;;
      --cd=*|--cwd=*)
        project="${1#*=}"
        shift
        continue
        ;;
    esac
    shift
  done

  if [ -d "$project" ]; then
    (cd "$project" && pwd)
  else
    printf '%s\n' "$PWD"
  fi
}

PROJECT_DIR="$(project_from_args "$@")"
HOOKS_HELPER="$PROJECT_DIR/.codex/tools/amadeus-codex-hooks.ts"
[ -f "$HOOKS_HELPER" ] || {
  echo "ERROR: missing Codex hooks helper in launch project: .codex/tools/amadeus-codex-hooks.ts" >&2
  exit 1
}
bun "$HOOKS_HELPER" activate --project-dir "$PROJECT_DIR" >/dev/null

exec mise exec -- "${HOME}/.agents/skills/agmsg/scripts/drivers/types/codex/codex-shim.sh" --dangerously-bypass-approvals-and-sandbox "$@"
