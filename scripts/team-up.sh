#!/usr/bin/env bash

set -euo pipefail

# Relaunch the agent team in ONE window: a leader plus N engineers laid out as
# three columns (left engineers | center leader | right engineers), attached in
# a single Ghostty window. N is 6 by default (3-1-3); -2/-4/-6 pick 2/4/6
# engineers (1-1-1 / 2-1-2 / 3-1-3). The layout is built with herdr, an
# agent-aware terminal multiplexer (https://herdr.dev).
#
# For each member pane this script re-applies agmsg monitor delivery, enters the
# member worktree, runs `mise trust`, and launches the selected agent runtime.
#
# Usage:
#   scripts/team-up.sh          # create a run + launch leader + 6 Claude members
#   scripts/team-up.sh -4       # create a run with 4 engineers (2-1-2)
#   scripts/team-up.sh --codex  # create a run + launch Codex members
#   scripts/team-up.sh -c       # resume each member's last conversation
#   scripts/team-up.sh --kill   # tear down the team session
#
# Env:
#   AGMSG_TEAM        team each member joins before launch (default: amadeus)
#   AGENT_IDENTITY    identity for the selected runtime (default: corporate-1)
#   TEAM_BASE         parent directory for team worktrees
#   TEAM_REPO         repository whose HEAD seeds a new team run
#   TEAM_STATE_DIR    local team run metadata directory
#   TEAM_RUNTIME      claude or codex (default: claude)
#   TEAM_ENGINEERS    engineer count for a fresh run: 2, 4, or 6 (default: 6)
#   TEAM_RUN_ID       fixed run ID (intended for deterministic automation)
#   TEAM_SESSION      session name (default: amadeus-team)
#   HERDR             herdr executable (default: herdr on PATH)
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
# Number of engineer members (leader is always added on top). Selectable per
# fresh run with -2/-4/-6; defaults to 6. A resumed run reads its saved size.
TEAM_SIZE="${TEAM_ENGINEERS:-6}"
TEAM_SIZE_EXPLICIT=0

# --- herdr launch layer --------------------------------------------------
# The 3-1-3 layout is built through a small set of mux_* verbs that drive
# herdr. Everything else (run management, worktrees, agmsg registration) is
# launch-neutral.

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

# The run record's mux file is a generation marker, not a backend selector:
# fresh runs always record "herdr". A run whose marker is missing or is not
# "herdr" predates the herdr-only launcher and cannot be driven here — reject
# it loudly with recovery guidance.
reject_legacy_run() {
  local run_id="$1" marker="$2"
  {
    echo "ERROR: run $run_id predates the herdr-only launcher (mux marker: ${marker:-<none>}); it cannot be resumed or killed here."
    echo "Its worktrees and branches are intact — create a fresh run to continue that work: scripts/team-up.sh"
    echo "If the old session is still attached, tear it down manually, e.g.: tmux kill-session -t $S"
  } >&2
  exit 1
}

# True when session $1 exists: a running herdr headless server answers
# `workspace list` over the session socket.
mux_has_session() {
  "$HERDR" --session "$1" workspace list >/dev/null 2>&1
}

# Tear down session $1, echoing killed/none. Keeps worktrees intact.
mux_kill() {
  # `session stop` alone is not enough: herdr persists the session's workspace
  # layout on disk and restores it (with dead shells) on the next `server`
  # start, leaving ghost workspaces in the UI. `session delete` removes the
  # persisted state as well — but stop is asynchronous, and a delete issued
  # while the server is still going down fails silently, resurrecting the
  # ghosts. Wait for the socket to actually die before deleting, and verify
  # the delete landed.
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
}

# mux_pane_label <session> <pane> <label> — name the pane after its member.
# herdr has no --label on pane split (0.7.1), so the label is applied
# post-create: `pane rename` sets the pane-border title; `agent rename` sets
# the name in the agents panel — without both, the herdr UI falls back to the
# workspace label and every agent renders as the session name (#999). Applied
# right after the pane is created and before its command runs, while no agent
# process is detected yet, so the rename lands immediately and persists
# (verified on 0.7.1). Cosmetic: never fail launch.
mux_pane_label() {
  local s="$1" pane="$2" label="$3"
  "$HERDR" --session "$s" pane rename "$pane" "$label" >/dev/null 2>&1 || true
  "$HERDR" --session "$s" agent rename "$pane" "$label" >/dev/null 2>&1 || true
}

# mux_new_session <session> <cwd> <cmd> <label> — create the session's first
# pane running <cmd> and echo its pane id.
mux_new_session() {
  local s="$1" cwd="$2" cmd="$3" label="$4" pane
  # herdr persists a session's workspace layout to session.json on stop / GUI
  # close / crash, and RESTORES it when the server next starts. We only reach
  # here when mux_has_session reported no running server, so any persisted
  # state is stale — starting the server without purging it would restore the
  # old workspaces and stack this run's workspace on top, leaving ghost spaces
  # in the UI (#999 follow-up). Delete the persisted state first so the server
  # starts clean with exactly one workspace.
  "$HERDR" session delete "$s" >/dev/null 2>&1 || true
  nohup "$HERDR" --session "$s" server >/dev/null 2>&1 &
  disown 2>/dev/null || true
  herdr_wait_ready "$s" || return 1
  pane="$("$HERDR" --session "$s" workspace create --cwd "$cwd" --label "$s" --no-focus | herdr_pane_id)"
  [ -n "$pane" ] || { echo "ERROR: herdr workspace create returned no pane id" >&2; return 1; }
  mux_pane_label "$s" "$pane" "$label"
  "$HERDR" --session "$s" pane run "$pane" "$cmd" >/dev/null
  printf '%s\n' "$pane"
}

# mux_split <session> <target_pane> <orient h|v> <newpct> <cwd> <cmd> <label>
# — split <target_pane> and echo the new pane id running <cmd>.
mux_split() {
  local s="$1" target="$2" orient="$3" pct="$4" cwd="$5" cmd="$6" label="$7" dir ratio pane
  case "$orient" in
  h) dir="right" ;;
  v) dir="down" ;;
  esac
  # The caller's pct sizes the NEW pane; herdr --ratio sizes the RETAINED
  # pane, so the ratio is inverted (66% new pane -> retained 0.34).
  ratio="$(awk "BEGIN{printf \"%.4f\", (100-$pct)/100}")"
  pane="$("$HERDR" --session "$s" pane split "$target" --direction "$dir" --ratio "$ratio" --cwd "$cwd" --no-focus | herdr_pane_id)"
  [ -n "$pane" ] || { echo "ERROR: herdr pane split returned no pane id" >&2; return 1; }
  mux_pane_label "$s" "$pane" "$label"
  "$HERDR" --session "$s" pane run "$pane" "$cmd" >/dev/null
  printf '%s\n' "$pane"
}

# Attach session $1 in a fresh Ghostty window.
mux_attach() {
  open -na Ghostty --args -e "$HERDR" session attach "$1"
}

CONTINUE=0
RUN_SELECTION=""
BASE_REF=""
RUN_NAME=""

usage() {
  cat <<'EOF'
Usage: scripts/team-up.sh [OPTIONS]

Without -c, creates a new run (leader + N engineers) from the repository HEAD.

  -c, --continue       Resume the current run and its saved runtime
  -2, -4, -6           Engineer count for a fresh run (default 6; leader always
                       added). Layout: -2 1-1-1, -4 2-1-2, -6 3-1-3
      --run ID         Resume a retained run (requires -c)
      --base REF       Seed a fresh run from REF instead of HEAD
      --name LABEL     Add a display name to a fresh run
      --claude         Use Claude for a fresh run
      --codex          Use Codex for a fresh run
      --kill           Stop the active session; keep its worktrees
      --list-runs      List retained runs
      --delete-run ID  Delete a stopped, clean run with no unmerged work
  -h, --help           Show this help

The first resume of legacy fixed worktrees requires --claude or --codex.

Runs created before the herdr-only launcher (their run record's mux marker is
absent or not "herdr") can no longer be resumed or killed; their worktrees and
branches stay intact, so create a fresh run to continue that work.

Environment:
  AGENT_IDENTITY      Identity for the selected runtime (default: corporate-1)
  TEAM_ENGINEERS      Engineer count for a fresh run: 2, 4, or 6 (default: 6)
EOF
}

# Echo "leader engineer-1 … engineer-N" for a run of N engineers.
members_for() {
  local n="$1" i out="leader"
  for i in $(seq 1 "$n"); do out="$out engineer-$i"; done
  printf '%s\n' "$out"
}

# Engineer count recorded for run $1 (its record dir). Runs predating the size
# record default to 6 — the fixed team size before this option existed.
record_size() {
  cat "$1/size" 2>/dev/null || printf '6'
}

valid_run_id() {
  case "$1" in
  "" | "." | ".." | [!A-Za-z0-9]* | *[!A-Za-z0-9._-]*) return 1 ;;
  *) return 0 ;;
  esac
}

run_owns_branch() {
  local run_record="$1" candidate="$2" m managed_branch
  for m in $(members_for "$(record_size "$run_record")"); do
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
  for m in $(members_for "$(record_size "$run_record")"); do
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

  for m in $(members_for "$(record_size "$run_record")"); do
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
  -2 | -4 | -6) TEAM_SIZE="${1#-}"; TEAM_SIZE_EXPLICIT=1 ;;
  -h | --help) usage; exit 0 ;;
  --claude) RUNTIME="claude"; RUNTIME_EXPLICIT=1 ;;
  --codex) RUNTIME="codex"; RUNTIME_EXPLICIT=1 ;;
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
    active_run=""
    if [ -f "$STATE_DIR/active-run" ]; then
      active_run="$(cat "$STATE_DIR/active-run")"
    fi
    # Legacy guard: refuse to --kill a run created before the herdr-only
    # launcher (its mux marker is absent or not "herdr"); its session, if any,
    # is not a herdr session this script can tear down.
    if [ -n "$active_run" ]; then
      saved_mux="$(cat "$STATE_DIR/runs/$active_run/mux" 2>/dev/null || true)"
      [ "$saved_mux" = "herdr" ] || reject_legacy_run "$active_run" "$saved_mux"
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
if [ "$CONTINUE" = "1" ] && [ "$TEAM_SIZE_EXPLICIT" = "1" ]; then
  echo "ERROR: -2/-4/-6 are only valid for a fresh run (a resumed run keeps its size)" >&2
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

# Validate the engineer count for a fresh run. The -2/-4/-6 flags already
# restrict the value, but TEAM_ENGINEERS accepts any string; reject anything
# outside {2,4,6} here so an out-of-range env never reaches the layout (0 or a
# non-number would crash under set -u). A resumed run skips this: load_run
# overwrites TEAM_SIZE from the run's recorded size.
if [ "$CONTINUE" != "1" ]; then
  case "$TEAM_SIZE" in
  2 | 4 | 6) ;;
  *)
    echo "invalid engineer count: $TEAM_SIZE (expected 2, 4, or 6)" >&2
    exit 1
    ;;
  esac
fi

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

# seed_codex_trust <worktree> <config_toml> — pre-seed BOTH trust layers Codex
# needs before it will run this project's hooks without an interactive TUI trust
# pass (Codex never runs untrusted hooks; the --dangerously-bypass-hook-trust
# flag does not run them either):
#   layer 1  [projects."<worktree>"] trust_level = "trusted"  (project trust)
#   layer 2  [hooks.state."..."] trusted_hash = "..."         (hook trust)
# Without layer 1, Codex skips the whole .codex hook layer with no warning, so
# both layers are required. Idempotent: each layer's anchor key line is probed
# with `grep -qF` and skipped when already present, so resume (-c) never
# duplicates entries. Surgical: only appends; never rewrites or deletes existing
# content, and only touches this worktree's entries. Any failure is loud and
# stops this member's launch.
seed_codex_trust() {
  local wt="$1" config="$2" dir entries line key
  dir="$(dirname "$config")"
  mkdir -p "$dir" || {
    echo "ERROR: cannot create Codex config dir: $dir" >&2
    return 1
  }
  [ -f "$config" ] || : >"$config" || {
    echo "ERROR: cannot create Codex config file: $config" >&2
    return 1
  }

  # Layer 1: project trust. Anchor key is the [projects."<wt>"] table header.
  if ! grep -qF "[projects.\"$wt\"]" "$config"; then
    printf '\n[projects."%s"]\ntrust_level = "trusted"\n' "$wt" >>"$config" || {
      echo "ERROR: cannot seed Codex project trust into $config" >&2
      return 1
    }
  fi

  # Layer 2: hook trust. package.ts prints the [hooks.state] entries with this
  # worktree substituted; append only entries whose header line is absent.
  entries="$(cd "$REPO" && bun scripts/package.ts codex trust --project "$wt")" || {
    echo "ERROR: cannot generate Codex hook-trust entries for $wt" >&2
    return 1
  }
  key=""
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
    "") continue ;;
    "[hooks.state."*)
      key="$line"
      ;;
    *)
      # Header + trusted_hash form one entry; flush after the hash line.
      if [ -n "$key" ] && ! grep -qF "$key" "$config"; then
        printf '\n%s\n%s\n' "$key" "$line" >>"$config" || {
          echo "ERROR: cannot seed Codex hook trust into $config" >&2
          return 1
        }
      fi
      key=""
      ;;
    esac
  done <<EOF
$entries
EOF
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

  # Pre-seed both Codex trust layers into this identity's config.toml before
  # emitting the launch command, so project hooks fire without a TUI trust pass.
  seed_codex_trust "$wt" "$codex_home/config.toml" || return 1

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

# stack_column <top_pane> <member...> — split the given members evenly down the
# column below top_pane (top_pane already holds the column's first member). The
# even division reproduces the old fixed ratios: 3 panes -> 66,50 / 2 -> 50 /
# 1 -> no split.
stack_column() {
  local top="$1"; shift
  local members=("$@") total=$(( $# + 1 )) prev="$top" j=1 pct mem
  for mem in "${members[@]}"; do
    pct=$(( 100 * (total - j) / (total - j + 1) ))
    prev="$(mux_split "$S" "$prev" v "$pct" "$(member_worktree "$mem")" "$(member_cmd "$mem" "$(member_worktree "$mem")")" "$mem")"
    j=$(( j + 1 ))
  done
}

register_team_members() {
  local m wt role agent_type
  [ -f "$AGMSG_JOIN" ] || { echo "ERROR: missing agmsg join script: $AGMSG_JOIN" >&2; return 1; }
  agent_type="$(agmsg_type)"
  for m in $(members_for "$TEAM_SIZE"); do
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
  # Generation marker (always "herdr" now that it is the only backend);
  # resume/--kill read it back as a legacy guard, rejecting runs whose marker
  # is absent or not "herdr".
  printf 'herdr\n' >"$RUN_RECORD/mux"
  printf '%s\n' "$RUN_NAME" >"$RUN_RECORD/name"
  printf '%s\n' "$base_ref" >"$RUN_RECORD/base-ref"
  printf '%s\n' "$base_commit" >"$RUN_RECORD/base-commit"
  printf '%s\n' "$TEAM_SIZE" >"$RUN_RECORD/size"
  printf 'preparing\n' >"$RUN_RECORD/status"

  for m in $(members_for "$TEAM_SIZE"); do
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
  # Legacy guard: only herdr-generation runs can be resumed. A run with an
  # absent or non-herdr mux marker predates the herdr-only launcher; reject it.
  saved_mux="$(cat "$RUN_RECORD/mux" 2>/dev/null || true)"
  [ "$saved_mux" = "herdr" ] || reject_legacy_run "$RUN_ID" "$saved_mux"
  # Engineer count is fixed by the run's worktrees; read the saved size.
  TEAM_SIZE="$(record_size "$RUN_RECORD")"
}

adopt_legacy_run() {
  local m wt branch
  if [ "$RUNTIME_EXPLICIT" != "1" ]; then
    echo "ERROR: the first legacy resume requires --claude or --codex" >&2
    return 1
  fi
  for m in $(members_for 6); do
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
  # These fixed worktrees are adopted and launched with herdr, so record the
  # herdr generation marker (see create_run).
  printf 'herdr\n' >"$RUN_RECORD/mux"
  printf '%s\n' "$(git -C "$REPO" rev-parse HEAD)" >"$RUN_RECORD/base-commit"
  printf 'stopped\n' >"$RUN_RECORD/status"
  printf '1\n' >"$RUN_RECORD/legacy"
  printf '6\n' >"$RUN_RECORD/size"
  for m in $(members_for 6); do
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
    echo "herdr session '$S' already exists — attaching instead." >&2
    mux_attach "$S"
    exit 0
  fi
  echo "ERROR: herdr session '$S' already exists" >&2
  echo "(tear it down first with: scripts/team-up.sh --kill)" >&2
  exit 1
fi

if [ "$CONTINUE" = "0" ]; then
  create_run
fi

for m in $(members_for "$TEAM_SIZE"); do
  wt="$(member_worktree "$m")"
  [ -d "$wt" ] || { echo "ERROR: missing worktree $wt" >&2; exit 1; }
done

register_team_members

# --- build the layout: [left column] | leader | [right column] ----------
# Engineers split evenly across the two side columns (ceil on the left); the
# center column is always the leader. 6 engineers -> 3-1-3, 4 -> 2-1-2,
# 2 -> 1-1-1. The columns are always 3, so the horizontal ratios (66 then 50)
# are unchanged; each side column is then stacked evenly.
if [ "$RUN_PREPARING" = "1" ]; then
  printf 'launching\n' >"$RUN_RECORD/status"
fi
left_count=$(( (TEAM_SIZE + 1) / 2 ))
left=(); right=()
for i in $(seq 1 "$TEAM_SIZE"); do
  if [ "$i" -le "$left_count" ]; then left+=("engineer-$i"); else right+=("engineer-$i"); fi
done
P_TOP_LEFT="$(mux_new_session "$S" "$(member_worktree "${left[0]}")" "$(member_cmd "${left[0]}" "$(member_worktree "${left[0]}")")" "${left[0]}")"
AGENTS_STARTED=1
P_LEADER="$(mux_split "$S" "$P_TOP_LEFT" h 66 "$(member_worktree leader)" "$(member_cmd leader "$(member_worktree leader)")" leader)"
P_TOP_RIGHT="$(mux_split "$S" "$P_LEADER" h 50 "$(member_worktree "${right[0]}")" "$(member_cmd "${right[0]}" "$(member_worktree "${right[0]}")")" "${right[0]}")"

stack_column "$P_TOP_LEFT" "${left[@]:1}"
stack_column "$P_TOP_RIGHT" "${right[@]:1}"

mux_attach "$S"
if [ -n "$RUN_ID" ]; then
  printf 'running\n' >"$RUN_RECORD/status"
  mkdir -p "$STATE_DIR"
  printf '%s\n' "$RUN_ID" >"$STATE_DIR/current-run"
  printf '%s\n' "$RUN_ID" >"$STATE_DIR/active-run"
fi
RUN_PREPARING=0
echo "session '$S' launched: ${left[*]} | leader | ${right[*]} ($TEAM_SIZE engineers, runtime=$RUNTIME, identity=$AGENT_IDENTITY)"
