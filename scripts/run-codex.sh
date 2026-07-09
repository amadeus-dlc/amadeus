#!/usr/bin/env bash

set -euo pipefail

CODEX_IDENTITY="${CODEX_IDENTITY:-corporate-1}"
export CODEX_IDENTITY
export PATH="${HOME}/.agents/bin:$PATH"
export CODEX_HOME="${HOME}/.codex-${CODEX_IDENTITY}"

exec mise exec -- "${HOME}/.agents/skills/agmsg/scripts/drivers/types/codex/codex-shim.sh" --dangerously-bypass-approvals-and-sandbox "$@"
