#!/usr/bin/env bash

set -euo pipefail

# Relaunch the 7-member agent team in ONE window: a session with a 3-1-3 pane
# layout (left column e1-e3, center leader, right column e4-e6), attached in a
# single Ghostty window. The launch backend is tmux by default; set
# TEAM_MUX=herdr (or pass --herdr) to build the same layout with herdr instead.
#
# For each member pane this script re-applies agmsg monitor delivery, enters the
# member worktree, runs `mise trust`, and launches the selected agent runtime.
#
# Usage:
#   scripts/team-up.sh          # create a run + launch all 7 Claude members
#   scripts/team-up.sh --codex  # create a run + launch all 7 Codex members
#   scripts/team-up.sh -c       # resume each member's last conversation
#   scripts/team-up.sh --kill   # tear down the team session
#   TEAM_MUX=herdr scripts/team-up.sh   # build the layout with herdr
#
# Env:
#   AGMSG_TEAM        team each member joins before launch (default: amadeus)
#   AGENT_IDENTITY    identity for the selected runtime (default: corporate-1)
#   TEAM_BASE         parent directory for team worktrees
#   TEAM_REPO         repository whose HEAD seeds a new team run
#   TEAM_STATE_DIR    local team run metadata directory
#   TEAM_RUNTIME      claude or codex (default: claude)
#   TEAM_RUN_ID       fixed run ID (intended for deterministic automation)
#   TEAM_SESSION      session name (default: amadeus-team)
#   TEAM_MUX          launch backend: tmux or herdr (default: tmux)
#
# In Claude mode, -c falls back to a fresh start for members without history.
# In Codex mode, -c resumes the last conversation in each member worktree.

REPO="${TEAM_REPO:-$(cd "$(dirname "$0")/.." && pwd)}"
BASE="${TEAM_BASE:-$HOME/worktrees/github.com/amadeus-dlc/amadeus}"
STATE_DIR="${TEAM_STATE_DIR:-$BASE/.team-up}"
AGMSG_ROOT="${AGMSG_ROOT:-$HOME/.agents/skills/agmsg}"
AGMSG_JOIN="${AGMSG_JOIN:-$AGMSG_ROOT/scripts/join.sh}"
AGMSG_RESET="${AGMSG_RESET:-$AGMSG_ROOT/scripts/reset.sh}"
DELIVERY="${DELIVERY:-$AGMSG_ROOT/scripts/delivery.sh}"
CODEX_MONITOR="${CODEX_MONITOR:-$AGMSG_ROOT/scripts/drivers/types/codex/codex-monitor.sh}"
ROLE_RESUME="${ROLE_RESUME:-$AGMSG_ROOT/scripts/role-resume.sh}"
TEAM_NAME="${AGMSG_TEAM:-amadeus}"
AGENT_IDENTITY="${AGENT_IDENTITY:-corporate-1}"
CLAUDE_IDENTITY="$AGENT_IDENTITY"
CODEX_IDENTITY="$AGENT_IDENTITY"
RUNTIME="${TEAM_RUNTIME:-claude}"
RUNTIME_EXPLICIT=0
S="${TEAM_SESSION:-amadeus-team}"
HERDR="${HERDR:-herdr}"

# --- launch backend abstraction (tmux default; herdr optional) -----------
# The 3-1-3 layout is built through a small set of mux_* verbs so the launch
# backend is swappable. tmux is the default and unchanged; herdr (an
# agent-aware terminal multiplexer, https://herdr.dev) is selectable via
# TEAM_MUX=herdr or --herdr. Everything else (run management, worktrees,
# agmsg registration) is backend-neutral.
#
# Resolve the backend before argument parsing so --kill (handled inline in
# the parse loop) sees it regardless of flag order. TEAM_MUX is the primary
# selector; the --herdr/--tmux flags are a convenience pre-scanned here.
MUX="${TEAM_MUX:-tmux}"
MUX_EXPLICIT=0
for _arg in "$@"; do
  case "$_arg" in
  --herdr) MUX="herdr"; MUX_EXPLICIT=1 ;;
  --tmux) MUX="tmux"; MUX_EXPLICIT=1 ;;
  esac
done
case "$MUX" in
tmux | herdr) ;;
*)
  echo "invalid TEAM_MUX: $MUX (expected tmux or herdr)" >&2
  exit 1
  ;;
esac

# Extract the first "pane_id":"..." from a herdr JSON response. Every herdr
# CLI command prints JSON; workspace-create and pane-split responses each
# carry exactly one pane_id (the root/new pane), so first-match is exact.
herdr_pane_id() { grep -o '"pane_id":"[^"]*"' | head -1 | cut -d'"' -f4; }

# Block until session S's headless server accepts socket commands.
herdr_wait_ready() {
  local s="$1" i
  for i in $(seq 1 50); do
    "$HERDR" --session "$s" workspace list >/dev/null 2>&1 && return 0
    sleep 0.2
  done
  echo "ERROR: herdr session '$s' did not become ready" >&2
  return 1
}

# True when session $1 exists (tmux: has-session; herdr: server accepts the
# session socket). A running herdr headless server answers workspace list.
mux_has_session() {
  case "$MUX" in
  tmux) tmux has-session -t "$1" 2>/dev/null ;;
  herdr) "$HERDR" --session "$1" workspace list >/dev/null 2>&1 ;;
  esac
}

# Tear down session $1, echoing killed/none. Keeps worktrees intact.
mux_kill() {
  case "$MUX" in
  tmux) tmux kill-session -t "$1" 2>/dev/null && echo "killed session $1" || echo "no session $1" ;;
  herdr)
    # `session stop` alone is not enough: herdr persists the session's
    # workspace layout on disk and restores it (with dead shells) on the
    # next `server` start, leaving ghost workspaces in the UI. `session
    # delete` removes the persisted state as well — but stop is
    # asynchronous, and a delete issued while the server is still going
    # down fails silently, resurrecting the ghosts. Wait for the socket
    # to actually die before deleting, and verify the delete landed.
    if "$HERDR" --session "$1" workspace list >/dev/null 2>&1; then
      "$HERDR" session stop "$1" >/dev/null 2>&1
      local _i
      for _i in $(seq 1 20); do
        "$HERDR" --session "$1" workspace list >/dev/null 2>&1 || break
        sleep 0.5
      done
      "$HERDR" session delete "$1" >/dev/null 2>&1
      if "$HERDR" session list 2>/dev/null | awk -v s="$1" '$1 == s { found=1 } END { exit !found }'; then
        echo "WARNING: herdr session $1 still present after delete — ghost workspaces may reappear" >&2
      fi
      echo "killed session $1"
    else
      # server not running: still delete any persisted session state
      "$HERDR" session delete "$1" >/dev/null 2>&1 && echo "killed session $1" || echo "no session $1"
    fi
    ;;
  esac
}

# mux_pane_label <session> <pane> <label> — name the pane after its member.
# tmux surfaces the member via pane-border-format (cwd basename); herdr has
# no --label on pane split (0.7.1), so the label is applied post-create via
# `pane rename` sets the pane-border title; `agent rename` sets the name in
# the agents panel — without both, the herdr UI falls back to the workspace
# label and every agent renders as the session name (#999). Applied right
# after the pane is created and before its command runs, while no agent
# process is detected yet, so the rename lands immediately and persists
# (verified on 0.7.1). Cosmetic: never fail launch.
mux_pane_label() {
  local s="$1" pane="$2" label="$3"
  case "$MUX" in
  tmux) : ;;
  herdr)
    "$HERDR" --session "$s" pane rename "$pane" "$label" >/dev/null 2>&1 || true
    "$HERDR" --session "$s" agent rename "$pane" "$label" >/dev/null 2>&1 || true
    ;;
  esac
}

# mux_new_session <session> <cwd> <cmd> <label> — create the session's first
# pane running <cmd> and echo its pane id.
mux_new_session() {
  local s="$1" cwd="$2" cmd="$3" label="$4" pane
  case "$MUX" in
  tmux)
    tmux new-session -d -s "$s" -x 300 -y 90 "$cmd"
    tmux display-message -p -t "$s" '#{pane_id}'
    ;;
  herdr)
    # herdr persists a session's workspace layout to session.json on stop /
    # GUI close / crash, and RESTORES it when the server next starts. We only
    # reach here when mux_has_session reported no running server, so any
    # persisted state is stale — starting the server without purging it would
    # restore the old workspaces and stack this run's workspace on top,
    # leaving ghost spaces in the UI (#999 follow-up). Delete the persisted
    # state first so the server starts clean with exactly one workspace.
    "$HERDR" session delete "$s" >/dev/null 2>&1 || true
    nohup "$HERDR" --session "$s" server >/dev/null 2>&1 &
    disown 2>/dev/null || true
    herdr_wait_ready "$s" || return 1
    pane="$("$HERDR" --session "$s" workspace create --cwd "$cwd" --label "$s" --no-focus | herdr_pane_id)"
    [ -n "$pane" ] || { echo "ERROR: herdr workspace create returned no pane id" >&2; return 1; }
    mux_pane_label "$s" "$pane" "$label"
    "$HERDR" --session "$s" pane run "$pane" "$cmd" >/dev/null
    printf '%s\n' "$pane"
    ;;
  esac
}

# mux_split <session> <target_pane> <orient h|v> <newpct> <cwd> <cmd> <label>
# — split <target_pane> and echo the new pane id running <cmd>.
mux_split() {
  local s="$1" target="$2" orient="$3" pct="$4" cwd="$5" cmd="$6" label="$7" dir ratio pane
  case "$MUX" in
  tmux)
    case "$orient" in
    h) tmux split-window -h -l "${pct}%" -t "$target" -P -F '#{pane_id}' "$cmd" ;;
    v) tmux split-window -v -l "${pct}%" -t "$target" -P -F '#{pane_id}' "$cmd" ;;
    esac
    ;;
  herdr)
    case "$orient" in
    h) dir="right" ;;
    v) dir="down" ;;
    esac
    # tmux -l sizes the NEW pane; herdr --ratio sizes the RETAINED pane, so
    # the ratio is inverted (66% new pane -> retained 0.34).
    ratio="$(awk "BEGIN{printf \"%.4f\", (100-$pct)/100}")"
    pane="$("$HERDR" --session "$s" pane split "$target" --direction "$dir" --ratio "$ratio" --cwd "$cwd" --no-focus | herdr_pane_id)"
    [ -n "$pane" ] || { echo "ERROR: herdr pane split returned no pane id" >&2; return 1; }
    mux_pane_label "$s" "$pane" "$label"
    "$HERDR" --session "$s" pane run "$pane" "$cmd" >/dev/null
    printf '%s\n' "$pane"
    ;;
  esac
}

# Focus pane $2 in session $1. herdr 0.7.1 has no focus-by-id; its native
# agent-status display makes the initial focused pane non-critical, so this
# is a no-op there.
mux_focus() {
  case "$MUX" in
  tmux) tmux select-pane -t "$2" ;;
  herdr) : ;;
  esac
}

# Attach session $1 in a fresh Ghostty window.
mux_attach() {
  case "$MUX" in
  tmux) open -na Ghostty --args -e tmux attach -t "$1" ;;
  herdr) open -na Ghostty --args -e "$HERDR" session attach "$1" ;;
  esac
}

CONTINUE=0
RUN_SELECTION=""
BASE_REF=""
RUN_NAME=""

usage() {
  cat <<'EOF'
Usage: scripts/team-up.sh [OPTIONS]

Without -c, creates a new seven-member run from the repository HEAD.

  -c, --continue       Resume the current run and its saved runtime
      --run ID         Resume a retained run (requires -c)
      --base REF       Seed a fresh run from REF instead of HEAD
      --name LABEL     Add a display name to a fresh run
      --claude         Use Claude for a fresh run
      --codex          Use Codex for a fresh run
      --kill           Stop the active session; keep its worktrees
      --herdr          Build the layout with herdr (default: tmux)
      --tmux           Build the layout with tmux (the default)
      --list-runs      List retained runs
      --delete-run ID  Delete a stopped, clean run with no unmerged work
  -h, --help           Show this help

The first resume of legacy fixed worktrees requires --claude or --codex.

Environment:
  AGENT_IDENTITY      Identity for the selected runtime (default: corporate-1)
  TEAM_MUX            Launch backend: tmux or herdr (default: tmux)
EOF
}

valid_run_id() {
  case "$1" in
  "" | "." | ".." | [!A-Za-z0-9]* | *[!A-Za-z0-9._-]*) return 1 ;;
  *) return 0 ;;
  esac
}

run_owns_branch() {
  local run_record="$1" candidate="$2" m managed_branch
  for m in leader engineer-1 engineer-2 engineer-3 engineer-4 engineer-5 engineer-6; do
    [ -f "$run_record/members/$m/branch" ] || continue
    managed_branch="$(cat "$run_record/members/$m/branch")"
    if [ -n "$managed_branch" ] && [ "$managed_branch" = "$candidate" ]; then
      return 0
    fi
  done
  return 1
}

delete_run() {
  local run_id="$1" run_record="$STATE_DIR/runs/$1" m wt branch head base_commit ref ref_branch merged_elsewhere
  valid_run_id "$run_id" || { echo "ERROR: invalid run ID: $run_id" >&2; return 1; }
  [ -d "$run_record" ] || { echo "ERROR: unknown run: $run_id" >&2; return 1; }
  if [ -f "$STATE_DIR/active-run" ] && [ "$(cat "$STATE_DIR/active-run")" = "$run_id" ]; then
    echo "ERROR: run is active; stop it with --kill first: $run_id" >&2
    return 1
  fi
  base_commit="$(cat "$run_record/base-commit")"

  # Validate every member before removing any resource.
  for m in leader engineer-1 engineer-2 engineer-3 engineer-4 engineer-5 engineer-6; do
    [ -f "$run_record/members/$m/path" ] || { echo "ERROR: missing path metadata for $run_id/$m" >&2; return 1; }
    wt="$(cat "$run_record/members/$m/path")"
    [ -d "$wt" ] || { echo "ERROR: missing worktree for $run_id/$m: $wt" >&2; return 1; }
    if [ -n "$(git -C "$wt" status --porcelain)" ]; then
      echo "ERROR: worktree is dirty for $run_id/$m: $wt" >&2
      return 1
    fi
    head="$(git -C "$wt" rev-parse HEAD)"
    [ "$head" = "$base_commit" ] && continue
    branch="$(cat "$run_record/members/$m/branch")"
    merged_elsewhere=0
    while IFS= read -r ref; do
      [ -n "$ref" ] || continue
      if [[ "$ref" = refs/heads/* ]]; then
        ref_branch="${ref#refs/heads/}"
        run_owns_branch "$run_record" "$ref_branch" && continue
      fi
      if [ "$ref" != "refs/heads/$branch" ]; then
        merged_elsewhere=1
        break
      fi
    done < <(git -C "$REPO" for-each-ref --contains "$head" --format='%(refname)' refs/heads refs/remotes)
    if [ "$merged_elsewhere" = "0" ]; then
      echo "ERROR: run has unmerged work for $run_id/$m on ${branch:-detached HEAD}" >&2
      return 1
    fi
  done

  for m in leader engineer-1 engineer-2 engineer-3 engineer-4 engineer-5 engineer-6; do
    wt="$(cat "$run_record/members/$m/path")"
    branch="$(cat "$run_record/members/$m/branch")"
    git -C "$REPO" worktree remove "$wt"
    if [ -n "$branch" ] && git -C "$REPO" show-ref --verify --quiet "refs/heads/$branch"; then
      git -C "$REPO" branch -D "$branch" >/dev/null
    fi
  done
  rmdir "$BASE/runs/$run_id" 2>/dev/null || true
  rm -rf -- "$run_record"
  if [ -f "$STATE_DIR/current-run" ] && [ "$(cat "$STATE_DIR/current-run")" = "$run_id" ]; then
    rm -f "$STATE_DIR/current-run"
  fi
  echo "deleted run $run_id"
}

while [ "$#" -gt 0 ]; do
  case "$1" in
  -c | --continue) CONTINUE=1 ;;
  -h | --help) usage; exit 0 ;;
  --claude) RUNTIME="claude"; RUNTIME_EXPLICIT=1 ;;
  --codex) RUNTIME="codex"; RUNTIME_EXPLICIT=1 ;;
  --herdr | --tmux) ;; # backend already resolved by the pre-scan above
  --run)
    shift
    [ "$#" -gt 0 ] || { echo "ERROR: --run requires an ID" >&2; exit 1; }
    RUN_SELECTION="$1"
    ;;
  --base)
    shift
    [ "$#" -gt 0 ] || { echo "ERROR: --base requires a ref" >&2; exit 1; }
    BASE_REF="$1"
    ;;
  --name)
    shift
    [ "$#" -gt 0 ] || { echo "ERROR: --name requires a label" >&2; exit 1; }
    RUN_NAME="$1"
    ;;
  --kill)
    # Kill with the backend that created the session, not the current default.
    # The active run records its mux; honor it so a bare --kill after a herdr
    # launch tears down the herdr session (not a phantom tmux one).
    active_run=""
    if [ -f "$STATE_DIR/active-run" ]; then
      active_run="$(cat "$STATE_DIR/active-run")"
    fi
    if [ -n "$active_run" ] && [ -f "$STATE_DIR/runs/$active_run/mux" ]; then
      saved_mux="$(cat "$STATE_DIR/runs/$active_run/mux")"
      if [ "$MUX_EXPLICIT" = "1" ] && [ "$MUX" != "$saved_mux" ]; then
        echo "ERROR: active run $active_run uses mux=$saved_mux, not mux=$MUX" >&2
        exit 1
      fi
      MUX="$saved_mux"
    fi
    mux_kill "$S"
    if [ -n "$active_run" ]; then
      if [ -d "$STATE_DIR/runs/$active_run" ]; then
        printf 'stopped\n' >"$STATE_DIR/runs/$active_run/status"
      fi
      rm -f "$STATE_DIR/active-run"
    fi
    exit 0
    ;;
  --list-runs)
    printf 'ID\tRUNTIME\tSTATUS\tNAME\n'
    for run_record in "$STATE_DIR"/runs/*; do
      [ -d "$run_record" ] || continue
      run_id="$(basename "$run_record")"
      run_runtime="$(cat "$run_record/runtime" 2>/dev/null || printf 'unknown')"
      run_status="$(cat "$run_record/status" 2>/dev/null || printf 'unknown')"
      run_name="$(cat "$run_record/name" 2>/dev/null || true)"
      printf '%s\t%s\t%s\t%s\n' "$run_id" "$run_runtime" "$run_status" "$run_name"
    done
    exit 0
    ;;
  --delete-run)
    shift
    [ "$#" -gt 0 ] || { echo "ERROR: --delete-run requires an ID" >&2; exit 1; }
    delete_run "$1"
    exit 0
    ;;
  *)
    echo "unknown arg: $1" >&2
    usage >&2
    exit 1
    ;;
  esac
  shift
done

if [ -n "$RUN_SELECTION" ] && [ "$CONTINUE" != "1" ]; then
  echo "ERROR: --run requires -c or --continue" >&2
  exit 1
fi
if [ "$CONTINUE" = "1" ] && { [ -n "$BASE_REF" ] || [ -n "$RUN_NAME" ]; }; then
  echo "ERROR: --base and --name are only valid for a fresh run" >&2
  exit 1
fi
if [ -n "$RUN_SELECTION" ] && ! valid_run_id "$RUN_SELECTION"; then
  echo "ERROR: invalid run ID: $RUN_SELECTION" >&2
  exit 1
fi

case "$RUNTIME" in
claude | codex) ;;
*)
  echo "invalid TEAM_RUNTIME: $RUNTIME (expected claude or codex)" >&2
  exit 1
  ;;
esac

# True if the identity has at least one saved conversation for this worktree.
# Claude Code stores history under CLAUDE_CONFIG_DIR/projects/<cwd with "/"
# and "." mapped to "-">/<session>.jsonl.
has_history() {
  local munged="${1//\//-}"
  munged="${munged//./-}"
  ls "$HOME/.claude-$CLAUDE_IDENTITY/projects/$munged"/*.jsonl >/dev/null 2>&1
}

claude_member_cmd() {
  local m="$1" wt="${2:-$BASE/$1}" args=""
  if [ "$CONTINUE" = "1" ]; then
    args="--continue"
  fi
  if [ "$args" = "--continue" ] && ! has_history "$wt"; then
    echo "WARN: no $CLAUDE_IDENTITY history for $m — starting fresh (dropping --continue)" >&2
    args=""
  fi
  if [ -f "$DELIVERY" ]; then
    bash "$DELIVERY" set monitor claude-code "$wt" >/dev/null 2>&1 ||
      echo "WARN: delivery.sh set monitor failed for $m (continuing)" >&2
  fi
  # keep the pane open after claude exits so crashes stay inspectable
  printf 'cd %q && mise trust -q 2>/dev/null; AMADEUS_OPERATING_MODE=team CLAUDE_IDENTITY=%q %q %s %q; exec $SHELL -l' \
    "$wt" "$CLAUDE_IDENTITY" "$REPO/scripts/run-claude.sh" "$args" "/agmsg mode monitor"
}

member_role() {
  case "$1" in
  leader) printf 'leader' ;;
  engineer-*) printf 'e%s' "${1#engineer-}" ;;
  esac
}

agmsg_type() {
  case "$RUNTIME" in
  claude) printf 'claude-code' ;;
  codex) printf 'codex' ;;
  esac
}

codex_member_cmd() {
  local m="$1" wt="${2:-$BASE/$1}" role prompt command="codex" resume_arg="" resume_uuid="" codex_home
  role="$(member_role "$m")"
  prompt="\$agmsg actas $role"
  codex_home="$HOME/.codex-$CODEX_IDENTITY"

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
    if resume_uuid="$("$ROLE_RESUME" codex "$TEAM_NAME" "$role" "$wt")"; then
      if [ -n "$resume_uuid" ]; then
        command="resume"
        resume_arg="$resume_uuid"
      else
        echo "WARN: no unique resumable thread for $role — starting fresh" >&2
      fi
    else
      echo "WARN: role resume resolver failed for $role — starting fresh" >&2
    fi
  fi

  # AGMSG_CODEX_ROLE disambiguates old role registrations that may coexist in
  # a reused worktree. Keep the pane open after Codex exits for inspection.
  printf 'cd %q && mise trust -q 2>/dev/null; AMADEUS_OPERATING_MODE=team CODEX_IDENTITY=%q CODEX_HOME=%q AGMSG_CODEX_ROLE=%q %q --project %q --codex-command %q -- %s %q; exec $SHELL -l' \
    "$wt" "$CODEX_IDENTITY" "$codex_home" "$role" "$CODEX_MONITOR" "$wt" "$command" "$resume_arg" "$prompt"
}

member_cmd() {
  case "$RUNTIME" in
  claude) claude_member_cmd "$1" "${2:-}" ;;
  codex) codex_member_cmd "$1" "${2:-}" ;;
  esac
}

member_worktree() {
  local path_file="$RUN_RECORD/members/$1/path"
  if [ -f "$path_file" ]; then
    cat "$path_file"
  else
    printf '%s/%s' "$BASE" "$1"
  fi
}

register_team_members() {
  local m wt role agent_type
  [ -f "$AGMSG_JOIN" ] || { echo "ERROR: missing agmsg join script: $AGMSG_JOIN" >&2; return 1; }
  agent_type="$(agmsg_type)"
  for m in leader engineer-1 engineer-2 engineer-3 engineer-4 engineer-5 engineer-6; do
    wt="$(member_worktree "$m")"
    role="$(member_role "$m")"
    if ! AGMSG_RESOLVE_PROJECT=0 bash "$AGMSG_JOIN" "$TEAM_NAME" "$role" "$agent_type" "$wt" >/dev/null; then
      echo "ERROR: agmsg registration failed for $m as $role in team $TEAM_NAME" >&2
      return 1
    fi
    REGISTERED_MEMBERS="$REGISTERED_MEMBERS $m"
  done
}

rollback_registered_members() {
  local m wt role agent_type
  [ -f "$AGMSG_RESET" ] || return 0
  agent_type="$(agmsg_type)"
  for m in $REGISTERED_MEMBERS; do
    wt="$RUN_ROOT/$m"
    role="$(member_role "$m")"
    AGMSG_RESOLVE_PROJECT=0 bash "$AGMSG_RESET" "$wt" "$agent_type" "$role" >/dev/null 2>&1 || true
  done
}

rollback_prepared_run() {
  local m wt branch
  rollback_registered_members
  for m in $CREATED_MEMBERS; do
    wt="$RUN_ROOT/$m"
    branch="team/$RUN_ID/$m"
    git -C "$REPO" worktree remove --force "$wt" >/dev/null 2>&1 || true
    git -C "$REPO" branch -D "$branch" >/dev/null 2>&1 || true
  done
  rm -rf -- "$RUN_ROOT" "$RUN_RECORD"
}

handle_exit() {
  local rc=$?
  trap - EXIT
  if [ "$rc" -ne 0 ] && [ "$RUN_PREPARING" = "1" ]; then
    if [ "$AGENTS_STARTED" = "0" ]; then
      rollback_prepared_run
    elif [ -d "$RUN_RECORD" ]; then
      printf 'failed\n' >"$RUN_RECORD/status"
    fi
  fi
  exit "$rc"
}

create_run() {
  local base_commit base_ref m wt branch
  base_ref="${BASE_REF:-HEAD}"
  if [ -z "$BASE_REF" ] && [ -n "$(git -C "$REPO" status --porcelain)" ]; then
    echo "ERROR: repository is dirty: $REPO" >&2
    return 1
  fi
  if ! base_commit="$(git -C "$REPO" rev-parse --verify "${base_ref}^{commit}" 2>/dev/null)"; then
    echo "ERROR: invalid base ref: $base_ref" >&2
    return 1
  fi
  RUN_ID="${TEAM_RUN_ID:-$(date '+%Y%m%d-%H%M%S')-$(printf '%04x' "$RANDOM")}"
  valid_run_id "$RUN_ID" || { echo "ERROR: invalid run ID: $RUN_ID" >&2; return 1; }
  RUN_ROOT="$BASE/runs/$RUN_ID"
  RUN_RECORD="$STATE_DIR/runs/$RUN_ID"
  [ ! -e "$RUN_ROOT" ] || { echo "ERROR: run worktree directory already exists: $RUN_ROOT" >&2; return 1; }
  [ ! -e "$RUN_RECORD" ] || { echo "ERROR: run metadata already exists: $RUN_RECORD" >&2; return 1; }

  mkdir -p "$RUN_ROOT" "$RUN_RECORD/members"
  RUN_PREPARING=1
  printf '%s\n' "$RUNTIME" >"$RUN_RECORD/runtime"
  printf '%s\n' "$MUX" >"$RUN_RECORD/mux"
  printf '%s\n' "$RUN_NAME" >"$RUN_RECORD/name"
  printf '%s\n' "$base_ref" >"$RUN_RECORD/base-ref"
  printf '%s\n' "$base_commit" >"$RUN_RECORD/base-commit"
  printf 'preparing\n' >"$RUN_RECORD/status"

  for m in leader engineer-1 engineer-2 engineer-3 engineer-4 engineer-5 engineer-6; do
    wt="$RUN_ROOT/$m"
    branch="team/$RUN_ID/$m"
    git -C "$REPO" worktree add -q -b "$branch" "$wt" "$base_commit"
    CREATED_MEMBERS="$CREATED_MEMBERS $m"
    mkdir -p "$RUN_RECORD/members/$m"
    printf '%s\n' "$wt" >"$RUN_RECORD/members/$m/path"
    printf '%s\n' "$branch" >"$RUN_RECORD/members/$m/branch"
  done
}

load_run() {
  local requested_id="$1" saved_runtime saved_mux
  if [ -n "$requested_id" ]; then
    RUN_ID="$requested_id"
  else
    [ -f "$STATE_DIR/current-run" ] || return 1
    RUN_ID="$(cat "$STATE_DIR/current-run")"
  fi
  RUN_RECORD="$STATE_DIR/runs/$RUN_ID"
  [ -d "$RUN_RECORD" ] || { echo "ERROR: missing metadata for current run: $RUN_ID" >&2; return 1; }
  [ -f "$RUN_RECORD/runtime" ] || { echo "ERROR: missing runtime for current run: $RUN_ID" >&2; return 1; }
  saved_runtime="$(cat "$RUN_RECORD/runtime")"
  if [ "$RUNTIME_EXPLICIT" = "1" ] && [ "$RUNTIME" != "$saved_runtime" ]; then
    echo "ERROR: run $RUN_ID uses runtime=$saved_runtime, not runtime=$RUNTIME" >&2
    return 1
  fi
  RUNTIME="$saved_runtime"
  # Resume with the backend that created the run. Runs predating the mux
  # record default to tmux.
  saved_mux="$(cat "$RUN_RECORD/mux" 2>/dev/null || printf 'tmux')"
  if [ "$MUX_EXPLICIT" = "1" ] && [ "$MUX" != "$saved_mux" ]; then
    echo "ERROR: run $RUN_ID uses mux=$saved_mux, not mux=$MUX" >&2
    return 1
  fi
  MUX="$saved_mux"
}

adopt_legacy_run() {
  local m wt branch
  if [ "$RUNTIME_EXPLICIT" != "1" ]; then
    echo "ERROR: the first legacy resume requires --claude or --codex" >&2
    return 1
  fi
  for m in leader engineer-1 engineer-2 engineer-3 engineer-4 engineer-5 engineer-6; do
    wt="$BASE/$m"
    [ -d "$wt" ] || { echo "ERROR: missing legacy worktree $wt" >&2; return 1; }
  done

  RUN_ID="legacy"
  RUN_RECORD="$STATE_DIR/runs/$RUN_ID"
  if [ -e "$RUN_RECORD" ]; then
    echo "ERROR: legacy run metadata already exists without a current-run pointer" >&2
    return 1
  fi
  mkdir -p "$RUN_RECORD/members"
  printf '%s\n' "$RUNTIME" >"$RUN_RECORD/runtime"
  printf '%s\n' "$MUX" >"$RUN_RECORD/mux"
  printf '%s\n' "$(git -C "$REPO" rev-parse HEAD)" >"$RUN_RECORD/base-commit"
  printf 'stopped\n' >"$RUN_RECORD/status"
  printf '1\n' >"$RUN_RECORD/legacy"
  for m in leader engineer-1 engineer-2 engineer-3 engineer-4 engineer-5 engineer-6; do
    wt="$BASE/$m"
    branch="$(git -C "$wt" branch --show-current)"
    mkdir -p "$RUN_RECORD/members/$m"
    printf '%s\n' "$wt" >"$RUN_RECORD/members/$m/path"
    printf '%s\n' "$branch" >"$RUN_RECORD/members/$m/branch"
  done
  mkdir -p "$STATE_DIR"
  printf '%s\n' "$RUN_ID" >"$STATE_DIR/current-run"
}

if [ "${TEAM_UP_LIB_ONLY:-0}" = "1" ]; then
  return 0 2>/dev/null || exit 0
fi

RUN_ID=""
RUN_RECORD=""
RUN_ROOT=""
CREATED_MEMBERS=""
REGISTERED_MEMBERS=""
RUN_PREPARING=0
AGENTS_STARTED=0
trap handle_exit EXIT
if [ "$CONTINUE" = "1" ]; then
  if [ -n "$RUN_SELECTION" ] || [ -f "$STATE_DIR/current-run" ]; then
    load_run "$RUN_SELECTION"
  else
    adopt_legacy_run
  fi
fi

if mux_has_session "$S"; then
  if [ "$CONTINUE" = "1" ]; then
    if [ -f "$STATE_DIR/active-run" ]; then
      active_run="$(cat "$STATE_DIR/active-run")"
      if [ -n "$RUN_ID" ] && [ "$active_run" != "$RUN_ID" ]; then
        echo "ERROR: run $active_run is active; stop it with --kill before resuming $RUN_ID" >&2
        exit 1
      fi
    fi
    echo "$MUX session '$S' already exists — attaching instead." >&2
    mux_attach "$S"
    exit 0
  fi
  echo "ERROR: $MUX session '$S' already exists" >&2
  echo "(tear it down first with: scripts/team-up.sh --kill)" >&2
  exit 1
fi

if [ "$CONTINUE" = "0" ]; then
  create_run
fi

for m in leader engineer-1 engineer-2 engineer-3 engineer-4 engineer-5 engineer-6; do
  wt="$(member_worktree "$m")"
  [ -d "$wt" ] || { echo "ERROR: missing worktree $wt" >&2; exit 1; }
done

register_team_members

# --- build the 3-1-3 layout ---------------------------------------------
# columns first: [e1] | [leader] | [e4], then split each side column into 3
if [ "$RUN_PREPARING" = "1" ]; then
  printf 'launching\n' >"$RUN_RECORD/status"
fi
P_E1="$(mux_new_session "$S" "$(member_worktree engineer-1)" "$(member_cmd engineer-1 "$(member_worktree engineer-1)")" engineer-1)"
AGENTS_STARTED=1
P_LEADER="$(mux_split "$S" "$P_E1" h 66 "$(member_worktree leader)" "$(member_cmd leader "$(member_worktree leader)")" leader)"
P_E4="$(mux_split "$S" "$P_LEADER" h 50 "$(member_worktree engineer-4)" "$(member_cmd engineer-4 "$(member_worktree engineer-4)")" engineer-4)"

P_E2="$(mux_split "$S" "$P_E1" v 66 "$(member_worktree engineer-2)" "$(member_cmd engineer-2 "$(member_worktree engineer-2)")" engineer-2)"
mux_split "$S" "$P_E2" v 50 "$(member_worktree engineer-3)" "$(member_cmd engineer-3 "$(member_worktree engineer-3)")" engineer-3 >/dev/null

P_E5="$(mux_split "$S" "$P_E4" v 66 "$(member_worktree engineer-5)" "$(member_cmd engineer-5 "$(member_worktree engineer-5)")" engineer-5)"
mux_split "$S" "$P_E5" v 50 "$(member_worktree engineer-6)" "$(member_cmd engineer-6 "$(member_worktree engineer-6)")" engineer-6 >/dev/null

mux_focus "$S" "$P_LEADER"
if [ "$MUX" = "tmux" ]; then
  tmux set-option -t "$S" pane-border-status top
  tmux set-option -t "$S" pane-border-format ' #{b:pane_current_path} '
fi

mux_attach "$S"
if [ -n "$RUN_ID" ]; then
  printf 'running\n' >"$RUN_RECORD/status"
  mkdir -p "$STATE_DIR"
  printf '%s\n' "$RUN_ID" >"$STATE_DIR/current-run"
  printf '%s\n' "$RUN_ID" >"$STATE_DIR/active-run"
fi
RUN_PREPARING=0
echo "session '$S' launched: e1-e3 | leader | e4-e6 (runtime=$RUNTIME, identity=$AGENT_IDENTITY)"
