#!/usr/bin/env bash

set -euo pipefail

# team-msg.sh — backend-neutral team messaging for the amadeus agent team.
#
# Verbs:
#   send <role> <text>   deliver <text> to <role>
#   read <role>          show <role>'s recent messages
#
# <role> is the agmsg role vocabulary (leader, e1, e2, …). The herdr backend
# maps it back to the herdr agent name (leader, engineer-1, …).
#
# The messaging backend is chosen by TEAM_MSG (default agmsg):
#   agmsg  delegate to ~/.agents/skills/agmsg (send.sh / history.sh)
#   herdr  drive the herdr agent multiplexer (wait -> send -> Enter)
#
# The ack / 3-minute-resend / idempotency conventions live in the team norms and
# apply to BOTH backends; this script is only the transport. Unlike agmsg's
# codex monitor, the herdr backend has no background poller — delivery is a
# direct wait -> send -> Enter against the recipient pane.
#
# Env:
#   TEAM_MSG          messaging backend: agmsg (default) or herdr
#   AGMSG_TEAM        team name for the agmsg backend (default: amadeus)
#   TEAM_MSG_FROM     this agent's own role, used as the message sender
#   HERDR             herdr executable (default: herdr on PATH)
#   TEAM_MSG_LOG_DIR  optional dir; when set, herdr sends are appended to a log
#   AGMSG_SEND        override path to agmsg send.sh (default: under HOME)
#   AGMSG_HISTORY     override path to agmsg history.sh (default: under HOME)

AGMSG_TEAM="${AGMSG_TEAM:-amadeus}"
HERDR="${HERDR:-herdr}"
AGMSG_SCRIPT_DIR="${AGMSG_ROOT:-$HOME/.agents/skills/agmsg}/scripts"
# The message sender. Callers export their own role; agmsg needs a non-empty
# from and the herdr log records it, so fall back to a loud placeholder rather
# than an empty string.
FROM="${TEAM_MSG_FROM:-unknown}"

# How long to wait for the recipient to finish its current turn (reach idle)
# before giving up and NOT sending. E-TMB-AD ruling A (2026-07-17): the wait is
# for the peer's current turn to complete, sized to one tool-execution scale
# (60s). This is a distinct concept from the 3-minute ack-resend window.
WAIT_IDLE_TIMEOUT_MS=60000

usage() {
  cat <<'EOF'
Usage: bash <harness-dir>/tools/team-msg.sh <verb> [args]

  send <role> <text>   Deliver <text> to <role> (leader, e1, e2, …)
  read <role>          Show <role>'s recent messages

Backend is selected by TEAM_MSG (agmsg default | herdr).
EOF
}

# Map an agmsg role to its herdr agent name (inverse of team-up.sh member_role):
# leader -> leader, eN -> engineer-N. Unknown values pass through unchanged.
resolve_herdr_target() {
  case "$1" in
  leader) printf 'leader' ;;
  e[0-9]*) printf 'engineer-%s' "${1#e}" ;;
  *) printf '%s' "$1" ;;
  esac
}

# Read `herdr agent list` JSON on stdin and echo the pane_id of the agent whose
# name is <target>. Each top-level agent object is separated by `},{`; splitting
# there puts one agent per line (the nested agent_session object closes with
# `},"` and is not split), so the pane_id is extracted from the matching line
# regardless of field order within the object.
herdr_pane_for_name() {
  local target="$1"
  sed 's/},{/}\n{/g' |
    grep "\"name\":\"$target\"" |
    head -1 |
    grep -o '"pane_id":"[^"]*"' |
    head -1 |
    cut -d'"' -f4
}

# Append one herdr delivery to the run's message log. Advisory: a write failure
# warns on stderr but never fails the send.
msg_log_append() {
  local from="$1" to="$2" body="$3" dir ts line
  dir="${TEAM_MSG_LOG_DIR:-}"
  [ -n "$dir" ] || return 0
  ts="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  line="$ts $from -> $to | $body"
  if ! { mkdir -p "$dir" && printf '%s\n' "$line" >>"$dir/messages.log"; } 2>/dev/null; then
    echo "WARN: could not append team message log under $dir" >&2
  fi
  return 0
}

agmsg_send() {
  local role="$1" text="$2" send
  send="${AGMSG_SEND:-$AGMSG_SCRIPT_DIR/send.sh}"
  [ -f "$send" ] || {
    echo "ERROR: missing agmsg send script: $send" >&2
    return 1
  }
  bash "$send" "$AGMSG_TEAM" "$FROM" "$role" "$text"
}

agmsg_read() {
  local role="$1" history
  history="${AGMSG_HISTORY:-$AGMSG_SCRIPT_DIR/history.sh}"
  [ -f "$history" ] || {
    echo "ERROR: missing agmsg history script: $history" >&2
    return 1
  }
  bash "$history" "$AGMSG_TEAM" "$role"
}

# A herdr bare turn carries no sender info, so the body's first line is a stable
# machine header naming the sender (from:<role>) and transport (via:herdr). It
# lets the recipient derive the sender for the ack convention and lets a future
# receiver hook recognize a machine message by this marker. The only variable
# part is from:<role>; the line stays well within 256 bytes. The agmsg backend
# carries the sender in its own metadata, so it does NOT get this header.
herdr_machine_header() {
  printf '[team-msg from:%s via:herdr machine]' "$FROM"
}

herdr_send() {
  local role="$1" text="$2" target pane wrapped
  target="$(resolve_herdr_target "$role")"
  # `|| true`: a no-match grep inside herdr_pane_for_name returns non-zero, which
  # under `set -e` + pipefail would abort here before the friendly check below.
  pane="$("$HERDR" agent list 2>/dev/null | herdr_pane_for_name "$target" || true)"
  if [ -z "$pane" ]; then
    echo "ERROR: no herdr agent named $target" >&2
    return 1
  fi
  # Wait for the recipient to finish its current turn. A timeout returns
  # non-zero: report and do NOT send (delivering mid-turn would be dropped).
  if ! "$HERDR" agent wait "$target" --status idle --timeout "$WAIT_IDLE_TIMEOUT_MS"; then
    echo "ERROR: herdr agent $target not idle within ${WAIT_IDLE_TIMEOUT_MS}ms — not sent" >&2
    return 1
  fi
  wrapped="$(herdr_machine_header)
$text"
  # `agent send` only places the text in the input; `pane send-keys enter`
  # submits it. The two form one delivery — a place without the Enter leaves the
  # message unsent. A non-zero from either is transparent (delivery is
  # uncertain, so it must surface, not be swallowed): under set -e it aborts and
  # propagates the failure to the caller.
  "$HERDR" agent send "$target" "$wrapped"
  "$HERDR" pane send-keys "$pane" enter
  msg_log_append "$FROM" "$role" "$text"
}

herdr_read() {
  local role="$1" target
  target="$(resolve_herdr_target "$role")"
  "$HERDR" agent read "$target"
}

dispatch_send() {
  case "$MSG_BACKEND" in
  agmsg) agmsg_send "$1" "$2" ;;
  herdr) herdr_send "$1" "$2" ;;
  esac
}

dispatch_read() {
  case "$MSG_BACKEND" in
  agmsg) agmsg_read "$1" ;;
  herdr) herdr_read "$1" ;;
  esac
}

main() {
  local verb="${1:-}"
  case "$verb" in
  send)
    shift
    [ "$#" -eq 2 ] || {
      echo "ERROR: send requires exactly <role> <text> (got $# arguments)" >&2
      return 1
    }
    dispatch_send "$1" "$2"
    ;;
  read)
    shift
    [ "$#" -ge 1 ] || {
      echo "ERROR: read requires <role>" >&2
      return 1
    }
    dispatch_read "$1"
    ;;
  -h | --help)
    usage
    ;;
  "")
    usage >&2
    return 1
    ;;
  *)
    echo "ERROR: unknown verb: $verb (send|read)" >&2
    return 1
    ;;
  esac
}

# Library mode: source the functions without running the CLI (for tests).
if [ "${TEAM_MSG_LIB_ONLY:-0}" = "1" ]; then
  return 0 2>/dev/null || exit 0
fi

# Resolve and validate the backend (fail-closed on an unknown value).
MSG_BACKEND="${TEAM_MSG:-agmsg}"
case "$MSG_BACKEND" in
agmsg | herdr) ;;
*)
  echo "ERROR: unknown msg backend: $MSG_BACKEND (agmsg|herdr)" >&2
  exit 1
  ;;
esac

main "$@"
