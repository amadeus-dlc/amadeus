#!/usr/bin/env bash

default_agent_identity() {
  local default_identity="$1"

  if [[ $# -ge 2 && -n "${2:-}" && "${2}" != -* ]]; then
    printf '%s\n' "$2"
    return
  fi

  printf '%s\n' "${default_identity}"
}

agent_identity_was_provided() {
  [[ $# -ge 1 && -n "${1:-}" && "${1}" != -* ]]
}

agent_config_dir() {
  local prefix="$1"
  local identity="$2"

  printf '%s/%s-%s\n' "${HOME}" "${prefix}" "${identity}"
}

exec_with_mise() {
  exec mise exec -- "$@"
}
