#!/usr/bin/env bash

set -euo pipefail

# Relaunch the 7-member agent team in ONE window: a tmux session with a
# 3-1-3 pane layout (left column e1-e3, center leader, right column e4-e6),
# attached in a single Ghostty window.
#
# For each member pane this script re-applies agmsg monitor delivery, enters the
# member worktree, runs `mise trust`, and launches the selected agent runtime.
#
# Usage:
#   scripts/team-up.sh          # build layout + launch all 7 Claude members
#   scripts/team-up.sh --codex  # build layout + launch all 7 Codex members
#   scripts/team-up.sh -c       # resume each member's last conversation
#   scripts/team-up.sh --kill   # tear down the tmux session
#
# Env:
#   CLAUDE_IDENTITY   identity for run-claude.sh (default: corporate-1)
#   TEAM_RUNTIME      claude or codex (default: claude)
#   TEAM_SESSION      tmux session name (default: amadeus-team)
#
# In Claude mode, -c falls back to a fresh start for members without history.
# In Codex mode, -c resumes the last conversation in each member worktree.

REPO="$(cd "$(dirname "$0")/.." && pwd)"
BASE="$HOME/worktrees/github.com/amadeus-dlc/amadeus"
AGMSG_ROOT="${AGMSG_ROOT:-$HOME/.agents/skills/agmsg}"
DELIVERY="${DELIVERY:-$AGMSG_ROOT/scripts/delivery.sh}"
CODEX_MONITOR="${CODEX_MONITOR:-$AGMSG_ROOT/scripts/drivers/types/codex/codex-monitor.sh}"
ROLE_RESUME="${ROLE_RESUME:-$AGMSG_ROOT/scripts/role-resume.sh}"
TEAM_NAME="${AGMSG_TEAM:-amadeus}"
IDENTITY="${CLAUDE_IDENTITY:-corporate-1}"
RUNTIME="${TEAM_RUNTIME:-claude}"
S="${TEAM_SESSION:-amadeus-team}"

CONTINUE=0
for arg in "$@"; do
  case "$arg" in
  -c | --continue) CONTINUE=1 ;;
  --claude) RUNTIME="claude" ;;
  --codex) RUNTIME="codex" ;;
  --kill)
    tmux kill-session -t "$S" 2>/dev/null && echo "killed session $S" || echo "no session $S"
    exit 0
    ;;
  *)
    echo "unknown arg: $arg (usage: team-up.sh [--claude|--codex] [-c|--kill])" >&2
    exit 1
    ;;
  esac
done

case "$RUNTIME" in
claude | codex) ;;
*)
  echo "invalid TEAM_RUNTIME: $RUNTIME (expected claude or codex)" >&2
  exit 1
  ;;
esac

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

claude_member_cmd() {
  local m="$1" wt="$BASE/$1" args=""
  if [ "$CONTINUE" = "1" ]; then
    args="--continue"
  fi
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

codex_role() {
  case "$1" in
  leader) printf 'leader' ;;
  engineer-*) printf 'codex-%s' "$1" ;;
  esac
}

codex_member_cmd() {
  local m="$1" wt="$BASE/$1" role prompt command="codex" resume_arg="" resume_uuid=""
  role="$(codex_role "$m")"
  prompt="\$agmsg actas $role"

  [ -x "$CODEX_MONITOR" ] || {
    echo "ERROR: missing Codex monitor launcher: $CODEX_MONITOR" >&2
    return 1
  }
  [ -x "$ROLE_RESUME" ] || {
    echo "ERROR: missing role resume resolver: $ROLE_RESUME" >&2
    return 1
  }
  if [ -f "$DELIVERY" ]; then
    AGMSG_CODEX_ROLE="$role" bash "$DELIVERY" set monitor codex "$wt" >/dev/null 2>&1 ||
      echo "WARN: delivery.sh set monitor failed for $m (continuing)" >&2
  fi
  if [ "$CONTINUE" = "1" ]; then
    resume_uuid="$("$ROLE_RESUME" codex "$TEAM_NAME" "$role" "$wt")"
    if [ -n "$resume_uuid" ]; then
      command="resume"
      resume_arg="$resume_uuid"
    else
      echo "WARN: no unique resumable thread for $role — starting fresh" >&2
    fi
  fi

  # AGMSG_CODEX_ROLE disambiguates old role registrations that may coexist in
  # a reused worktree. Keep the pane open after Codex exits for inspection.
  printf 'cd %q && mise trust -q 2>/dev/null; AGMSG_CODEX_ROLE=%q %q --project %q --codex-command %q -- %s %q; exec $SHELL -l' \
    "$wt" "$role" "$CODEX_MONITOR" "$wt" "$command" "$resume_arg" "$prompt"
}

member_cmd() {
  case "$RUNTIME" in
  claude) claude_member_cmd "$1" ;;
  codex) codex_member_cmd "$1" ;;
  esac
}

if [ "${TEAM_UP_LIB_ONLY:-0}" = "1" ]; then
  return 0 2>/dev/null || exit 0
fi

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
if [ "$RUNTIME" = "claude" ]; then
  echo "session '$S' launched: e1-e3 | leader | e4-e6 (runtime=claude, identity=$IDENTITY)"
else
  echo "session '$S' launched: e1-e3 | leader | e4-e6 (runtime=codex)"
fi
