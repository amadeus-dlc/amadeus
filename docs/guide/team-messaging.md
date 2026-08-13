# Team Messaging Backend

> Languages: **English** | [日本語](team-messaging.ja.md)

> Audience: maintainers exchanging messages between agent roles with
> `{{HARNESS_DIR}}/tools/team-msg.sh`.

In team mode the leader and engineers exchange messages through a **messaging
backend**. Two backends are available; the transport differs but the team
conventions (ack, 3-minute resend, idempotent handling of duplicates) are the
same on both.

## Selecting a backend

Choose the backend with the `TEAM_MSG` environment variable. It defaults to
`agmsg`.

```bash
export TEAM_MSG=agmsg    # default: agmsg store + monitor delivery
export TEAM_MSG=herdr    # herdr agent multiplexer, no separate poller
```

An unknown value is rejected fail-closed by `team-msg.sh`.

## Sending and reading

`{{HARNESS_DIR}}/tools/team-msg.sh` is the backend-neutral transport:

```bash
{{HARNESS_DIR}}/tools/team-msg.sh send <role> <text>   # role: leader, e1, e2, …
{{HARNESS_DIR}}/tools/team-msg.sh read <role>
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

## Runtime prerequisites

herdr and agmsg remain external tools. Codex members launch the `codex` command
resolved from `PATH`; the user's environment owns its installation and version
selection. See [Team Mode](20-team-mode.md#prerequisites) for installation
sources, verified versions, and path overrides.

## Send audit log

Under the herdr backend, when `TEAM_MSG_LOG_DIR` is set, each
`team-msg.sh send` appends one line to `<log dir>/messages.log`. That file is
the primary send-side record for election provenance (the herdr analogue of
agmsg history). A write failure only warns on stderr — it never fails the send.
