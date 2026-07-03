#!/usr/bin/env bash

export PATH="${HOME}/.agents/bin:$PATH"
export CODEX_HOME="${HOME}/.codex-personal"

exec mise exec -- "${HOME}/.agents/bin/codex" \
  --dangerously-bypass-approvals-and-sandbox \
  -m gpt-5.5 \
  -c model_reasoning_effort=\"low\" \
  -c model_service_tier=\"priority\" \
  "$@"
