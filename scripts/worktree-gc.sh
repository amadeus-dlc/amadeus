#!/usr/bin/env bash

set -euo pipefail

apply=0
base_ref=""
while [ "$#" -gt 0 ]; do
  case "$1" in
  --apply) apply=1 ;;
  --base)
    shift
    [ "$#" -gt 0 ] || {
      echo "ERROR: --base requires a ref" >&2
      exit 2
    }
    base_ref="$1"
    ;;
  -h | --help)
    cat <<'EOF'
Usage: scripts/worktree-gc.sh [--base REF] [--apply]

Remove clean, merged secondary worktrees and prune stale worktree metadata.
The default merge target is the main worktree HEAD. The default mode is a dry run.
Local branches are never deleted.

  --base REF
           Use REF instead of the main worktree HEAD as the merge target
  --apply  Remove eligible worktrees
  -h, --help
           Show this help
EOF
    exit 0
    ;;
  *)
    echo "ERROR: unknown option: $1" >&2
    exit 2
    ;;
  esac
  shift
done

repo_root="$(git rev-parse --show-toplevel 2>/dev/null)" || {
  echo "ERROR: not inside a Git worktree" >&2
  exit 1
}
current_worktree="$(cd "$repo_root" && pwd -P)"

paths=()
heads=()
locked_states=()
prunable_states=()
path=""
head=""
locked=0
prunable=0

record_worktree() {
  [ -n "$path" ] || return 0
  paths+=("$path")
  heads+=("$head")
  locked_states+=("$locked")
  prunable_states+=("$prunable")
  path=""
  head=""
  locked=0
  prunable=0
  return 0
}

while IFS= read -r -d '' field; do
  case "$field" in
  "worktree "*) path="${field#worktree }" ;;
  "HEAD "*) head="${field#HEAD }" ;;
  "locked"*) locked=1 ;;
  "prunable"*) prunable=1 ;;
  "") record_worktree ;;
  esac
done < <(git -C "$repo_root" worktree list --porcelain -z)
record_worktree

[ "${#paths[@]}" -gt 0 ] || {
  echo "ERROR: no Git worktrees found" >&2
  exit 1
}

base="${heads[0]}"
if [ -n "$base_ref" ]; then
  if ! base="$(git -C "$repo_root" rev-parse --verify --quiet --end-of-options "${base_ref}^{commit}")"; then
    echo "ERROR: invalid base ref: $base_ref" >&2
    exit 2
  fi
fi
for index in "${!paths[@]}"; do
  candidate="${paths[$index]}"

  # The first record is the main worktree. The invoking worktree is also protected.
  if [ "$index" -eq 0 ]; then
    echo "[kept: main] $candidate"
    continue
  fi
  if [ "$candidate" = "$current_worktree" ]; then
    echo "[kept: current] $candidate"
    continue
  fi
  if [ "${locked_states[$index]}" -eq 1 ]; then
    echo "[kept: locked] $candidate"
    continue
  fi
  if [ "${prunable_states[$index]}" -eq 1 ]; then
    if [ "$apply" -eq 0 ]; then
      echo "[dry-run] prune $candidate"
    fi
    continue
  fi
  if [ ! -d "$candidate" ]; then
    echo "[kept: unavailable] $candidate"
    continue
  fi
  if ! status="$(git -C "$candidate" status --porcelain --untracked-files=all 2>/dev/null)"; then
    echo "[kept: unavailable] $candidate"
    continue
  fi
  if [ -n "$status" ]; then
    echo "[kept: dirty] $candidate"
    continue
  fi
  if ! git -C "$repo_root" merge-base --is-ancestor "${heads[$index]}" "$base"; then
    echo "[kept: unmerged] $candidate"
    continue
  fi

  if [ "$apply" -eq 1 ]; then
    git -C "$repo_root" worktree remove "$candidate"
    echo "[removed] $candidate"
  else
    echo "[dry-run] remove $candidate"
  fi
done

if [ "$apply" -eq 1 ]; then
  git -C "$repo_root" worktree prune --verbose --expire now 2>&1
fi
