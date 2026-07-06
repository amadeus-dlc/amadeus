#!/usr/bin/env bash
# POSIX compatibility wrapper for the native Bun/TypeScript Windows sync helper.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -d "$HOME/.bun/bin" ]; then
  export PATH="$HOME/.bun/bin:$PATH"
fi

if ! command -v bun >/dev/null 2>&1; then
  echo "ERROR: bun is required to run the Windows sync helper" >&2
  exit 127
fi

exec bun "$SCRIPT_DIR/sync.ts" "$@"
