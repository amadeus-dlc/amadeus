#!/usr/bin/env bash

set -euo pipefail

CLAUDE_IDENTITY="${CLAUDE_IDENTITY:-corporate-1}"
export CLAUDE_IDENTITY
export CLAUDE_CONFIG_DIR="${HOME}/.claude-${CLAUDE_IDENTITY}"
unset CLAUDE_CODE_OAUTH_TOKEN

exec mise exec -- claude --dangerously-skip-permissions "$@"
