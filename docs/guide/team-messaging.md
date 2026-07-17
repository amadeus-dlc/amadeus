# Team Messaging Backend

> Audience: maintainers running an agent team with `scripts/team-up.sh`.

In team mode the leader and engineers exchange messages through a **messaging
backend**. Two backends are available; the transport differs but the team
conventions (ack, 3-minute resend, idempotent handling of duplicates) are the
same on both.

## Selecting a backend

Choose the backend for a **fresh** run with `--msg` or the `TEAM_MSG`
environment variable (the flag wins). It defaults to `agmsg` and is saved to the
run record, so a resumed run (`-c`) inherits it — `--msg` is rejected on resume.

```bash
scripts/team-up.sh --msg agmsg    # default: agmsg store + monitor delivery
scripts/team-up.sh --msg herdr    # herdr agent multiplexer, no separate poller
TEAM_MSG=herdr scripts/team-up.sh # same, via the environment
```

An unknown value is rejected fail-closed:
`ERROR: unknown msg backend: <value> (agmsg|herdr)`.

Members are launched with `TEAM_MSG` exported, so their `scripts/team-msg.sh`
calls use the same backend the run was created with.

## Sending and reading

`scripts/team-msg.sh` is the backend-neutral transport:

```bash
scripts/team-msg.sh send <role> <text>   # role: leader, e1, e2, …
scripts/team-msg.sh read <role>
```

- **agmsg** delegates to the agmsg skill (`send.sh` / `history.sh`); the store
  carries the sender in its own metadata.
- **herdr** drives the recipient pane directly: it resolves the role to the
  herdr agent name (`e1` → `engineer-1`), waits for the recipient to finish its
  current turn (reach `idle`, one tool-execution scale ≈ 60s), then **places the
  text and presses Enter** — both steps are one delivery. If the recipient does
  not go idle in time, nothing is sent and the call returns non-zero. There is
  **no background poller** under herdr (unlike the agmsg Codex monitor).

Because a herdr bare turn carries no sender information, each herdr send prepends
a stable machine header as the body's **first line**, then the original body:

```
[team-msg from:<role> via:herdr machine]
```

Only `from:<role>` varies. The agmsg backend does **not** add this header — its
metadata already names the sender.

## Runtime prerequisites under the herdr backend

- **claude** members launch without any agmsg installation (`AGMSG_ROOT` may be
  absent entirely).
- **codex** members still require the agmsg skill to be installed: the codex
  launcher (`scripts/run-codex.sh`) execs the agmsg codex shim internally, so
  the herdr backend changes codex messaging, not the codex launch path
  (per-intent ruling E-TMB-CG, 2026-07-17). Removing that shim dependency is a
  possible future enhancement.

## Send audit log

Under the herdr backend, `team-up.sh` wires `TEAM_MSG_LOG_DIR` (the run record
directory) into every member's environment, so each `team-msg.sh send` appends
one line to `<run record>/messages.log`. That file is the primary send-side
record for election provenance (the herdr analogue of agmsg history). A write
failure only warns on stderr — it never fails the send.
