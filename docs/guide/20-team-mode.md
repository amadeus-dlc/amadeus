# Team Mode

> Languages: **English** | [日本語](20-team-mode.ja.md)

Team Mode is the opt-in way to run an Amadeus workflow with a leader and
multiple engineers in isolated worktrees. It uses the same workflow and quality
rules as a solo run; the difference is how responsibilities and coordination
are distributed.

## Launcher removed

Amadeus no longer ships `team-up.sh`. That launcher is gone from the
distribution. The former Codex safety-wait helper is gone with it.

Team messaging (`team-msg.sh`) and the election CLI remain. Sessions that need
the Team Mode contract still use the exact marker
`AMADEUS_OPERATING_MODE=team`; Amadeus does not provide a launcher that sets it.

## Overview

Without `AMADEUS_OPERATING_MODE=team`, Amadeus operates in solo mode. Team Mode
is optional. Use it when independent builders, reviewers, or a team election
are useful; a normal Amadeus workflow does not require it.

## Prerequisites

External tools that a custom team setup may still need:

| Tool | Verified version | Source and runtime contract |
|------|------------------|-----------------------------|
| [Bun](https://bun.sh) | 1.3.13 | `bun` must be executable on `PATH`. |
| [herdr](https://herdr.dev) | 0.7.1 | `herdr` must be executable on `PATH`; `HERDR` may select another executable. |
| [agmsg](https://github.com/j5ik2o/agmsg) | 1.1.6 | Install the skill at `$HOME/.agents/skills/agmsg`; its scripts must be executable. `AGMSG_ROOT` and the documented script overrides may select another installation. |

These are the versions verified for this guide, not an ongoing compatibility
guarantee. Amadeus does not bundle them or guarantee their installation
channels.

```text
$amadeus --doctor
```

## Messaging

Send or inspect a message through the installed tool directory:

```bash
bash {{HARNESS_DIR}}/tools/team-msg.sh send e1 "Please review the proposal."
bash {{HARNESS_DIR}}/tools/team-msg.sh read leader
```

Set `TEAM_MSG` to `agmsg` (default) or `herdr` for the transport. Roles use
`leader`, `e1`, `e2`, and so on. For backend details see
[Team Messaging Backend](team-messaging.md).

## Running an election

The distributed `amadeus-election` skill drives the CLI as a directive loop.
Prepare an election definition with `electionId`, `kind`, `question`, `choices`,
and `voters`, then open it:

```json
{
  "electionId": "E-EXAMPLE-1",
  "kind": "zero-confirm",
  "question": "Approve the proposal?",
  "choices": [
    { "internalNo": 1, "label": "approve", "description": "Adopt the proposal as written." }
  ],
  "voters": ["e1"]
}
```

Each choice may carry an optional `description` — the body text of that option.
The per-voter blind view repeats the election's `question` and each choice's
`description`, so a voter reading only their own view can tell what the motion
is and what each choice means. A choice without a `description` is still valid;
the key is then simply absent from the view.

```bash
bun {{HARNESS_DIR}}/tools/amadeus-election.ts open --file election.json
bun {{HARNESS_DIR}}/tools/amadeus-election.ts next --election E-EXAMPLE-1
```

Read each `next` response and execute only the verb and report it names:

1. For `collect-wait`, collect a ballot and submit it with
   `vote --election E-EXAMPLE-1 --file ballot.json`.
2. For another executable directive, run its `verb` with
   `--election E-EXAMPLE-1`, then run
   `report --election E-EXAMPLE-1 --result <reported-result>`.
3. For `hold`, stop and give its reason and choices to a human. After the human
   decides, use `report --election E-EXAMPLE-1 --result hold-resolved
   --resolution <human-decision>`.
4. Repeat `next` until it returns `done`, then report the emitted election
   record path.

`status --election E-EXAMPLE-1` is a read-only inspection command. Neither the
skill nor this guide substitutes its own judgement for a directive or a human
decision.

## Operating Modes contract

`AMADEUS_OPERATING_MODE=team` is the sole mode marker. Its absence selects solo
mode. A messaging registration, member count, or saved session is not evidence
that Team Mode is active.

Both modes keep the same rule layers, evidence requirements, verification
standards, and escalation boundaries. Team Mode assigns coordination,
independent review, worktree isolation, and elections across members; solo mode
performs applicable responsibilities sequentially and never invents absent
members or votes.

This section is a user-facing summary. The team's `memory/team.md` is the
normative source for operating practices and may specialize them for a
workspace.
