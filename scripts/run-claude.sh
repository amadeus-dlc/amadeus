#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/agent-runner.sh"

CLAUDE_IDENTITY="$(default_agent_identity "corporate-1" "${1:-}")"
export CLAUDE_IDENTITY
export CLAUDE_CONFIG_DIR
CLAUDE_CONFIG_DIR="$(agent_config_dir ".claude" "${CLAUDE_IDENTITY}")"
unset CLAUDE_CODE_OAUTH_TOKEN
agent_identity_was_provided "${1:-}" && shift

exec_with_mise claude --dangerously-skip-permissions "$@"
