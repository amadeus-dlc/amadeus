#!/usr/bin/env bash

set -euo pipefail

# Relaunch the 7-member agent team in ONE window: a tmux session with a
# 3-1-3 pane layout (left column e1-e3, center leader, right column e4-e6),
# attached in a single Ghostty window.
#
# For each member pane this script:
#   1. re-applies agmsg monitor delivery (idempotent settings.local.json injection)
#   2. cd's into the member worktree, runs `mise trust`, then the identity
#      runner (scripts/run-claude.sh) with "/agmsg mode monitor" as the
#      initial prompt so the session arms its monitor immediately.
#
# Usage:
#   scripts/team-up.sh          # build layout + launch all 7 members
#   scripts/team-up.sh -c       # pass --continue to claude (resume last conversation)
#   scripts/team-up.sh --kill   # tear down the tmux session
#
# Env:
#   CLAUDE_IDENTITY   identity for run-claude.sh (default: corporate-1)
#   TEAM_SESSION      tmux session name (default: amadeus-team)
#
# With -c, members that have no prior conversation under the chosen identity
# fall back to a fresh start (claude --continue exits with "No conversation
# found to continue" otherwise, leaving a dead pane).

REPO="$(cd "$(dirname "$0")/.." && pwd)"
BASE="$HOME/worktrees/github.com/amadeus-dlc/amadeus"
DELIVERY="$HOME/.agents/skills/agmsg/scripts/delivery.sh"
IDENTITY="${CLAUDE_IDENTITY:-corporate-1}"
S="${TEAM_SESSION:-amadeus-team}"

CLAUDE_ARGS=""
for arg in "$@"; do
  case "$arg" in
  -c | --continue) CLAUDE_ARGS="--continue" ;;
  --kill)
    tmux kill-session -t "$S" 2>/dev/null && echo "killed session $S" || echo "no session $S"
    exit 0
    ;;
  *)
    echo "unknown arg: $arg (usage: team-up.sh [-c|--kill])" >&2
    exit 1
    ;;
  esac
done

if tmux has-session -t "$S" 2>/dev/null; then
  echo "tmux session '$S' already exists — attaching instead." >&2
  echo "(tear it down first with: scripts/team-up.sh --kill)" >&2
  open -na Ghostty --args -e tmux attach -t "$S"
  exit 0
fi

# True if the identity has at least one saved conversation for this worktree.
# Claude Code stores history under CLAUDE_CONFIG_DIR/projects/<cwd with "/"
# and "." mapped to "-">/<session>.jsonl.
has_history() {
  local munged="${1//\//-}"
  munged="${munged//./-}"
  ls "$HOME/.claude-$IDENTITY/projects/$munged"/*.jsonl >/dev/null 2>&1
}

member_cmd() {
  local m="$1" wt="$BASE/$1" args="$CLAUDE_ARGS"
  if [ "$args" = "--continue" ] && ! has_history "$wt"; then
    echo "WARN: no $IDENTITY history for $m — starting fresh (dropping --continue)" >&2
    args=""
  fi
  if [ -f "$DELIVERY" ]; then
    bash "$DELIVERY" set monitor claude-code "$wt" >/dev/null 2>&1 ||
      echo "WARN: delivery.sh set monitor failed for $m (continuing)" >&2
  fi
  # keep the pane open after claude exits so crashes stay inspectable
  printf 'cd %q && mise trust -q 2>/dev/null; CLAUDE_IDENTITY=%q %q %s %q; exec $SHELL -l' \
    "$wt" "$IDENTITY" "$REPO/scripts/run-claude.sh" "$args" "/agmsg mode monitor"
}

for m in leader engineer-1 engineer-2 engineer-3 engineer-4 engineer-5 engineer-6; do
  [ -d "$BASE/$m" ] || { echo "ERROR: missing worktree $BASE/$m" >&2; exit 1; }
done

# --- build the 3-1-3 layout ---------------------------------------------
# columns first: [e1] | [leader] | [e4], then split each side column into 3
tmux new-session -d -s "$S" -x 300 -y 90 "$(member_cmd engineer-1)"
P_E1="$(tmux display-message -p -t "$S" '#{pane_id}')"
P_LEADER="$(tmux split-window -h -l '66%' -t "$P_E1" -P -F '#{pane_id}' "$(member_cmd leader)")"
P_E4="$(tmux split-window -h -l '50%' -t "$P_LEADER" -P -F '#{pane_id}' "$(member_cmd engineer-4)")"

P_E2="$(tmux split-window -v -l '66%' -t "$P_E1" -P -F '#{pane_id}' "$(member_cmd engineer-2)")"
tmux split-window -v -l '50%' -t "$P_E2" "$(member_cmd engineer-3)"

P_E5="$(tmux split-window -v -l '66%' -t "$P_E4" -P -F '#{pane_id}' "$(member_cmd engineer-5)")"
tmux split-window -v -l '50%' -t "$P_E5" "$(member_cmd engineer-6)"

tmux select-pane -t "$P_LEADER"
tmux set-option -t "$S" pane-border-status top
tmux set-option -t "$S" pane-border-format ' #{b:pane_current_path} '

open -na Ghostty --args -e tmux attach -t "$S"
echo "session '$S' launched: e1-e3 | leader | e4-e6 (identity=$IDENTITY)"
