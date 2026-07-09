#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/agent-runner.sh"

CODEX_IDENTITY="$(default_agent_identity "corporate-1" "${1:-}")"
export CODEX_IDENTITY
export PATH="${HOME}/.agents/bin:$PATH"
export CODEX_HOME
CODEX_HOME="$(agent_config_dir ".codex" "${CODEX_IDENTITY}")"
agent_identity_was_provided "${1:-}" && shift

exec_with_mise "${HOME}/.agents/skills/agmsg/scripts/drivers/types/codex/codex-shim.sh" --dangerously-bypass-approvals-and-sandbox "$@"
