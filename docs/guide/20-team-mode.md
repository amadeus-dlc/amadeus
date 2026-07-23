# Team Mode

> Languages: **English** | [日本語](20-team-mode.ja.md)

Team Mode is the opt-in way to run an Amadeus workflow with a leader and
multiple engineers in isolated worktrees. It uses the same workflow and quality
rules as a solo run; the difference is how responsibilities and coordination
are distributed.

## Overview

The team launcher starts Claude Code or Codex members in one herdr workspace,
connects their messaging transport, and marks every member session with
`AMADEUS_OPERATING_MODE=team`. Without that exact marker, Amadeus operates in
solo mode.

Team Mode is optional. Use it when independent builders, reviewers, or a team
election are useful; a normal Amadeus workflow does not require it. The launcher
supports macOS and Linux. Team Mode on Windows is not supported.

## Prerequisites

Install these tools before launching a team:

| Tool | Verified version | Source and runtime contract |
|------|------------------|-----------------------------|
| [Bun](https://bun.sh) | 1.3.13 | `bun` must be executable on `PATH`. |
| [herdr](https://herdr.dev) | 0.7.1 | `herdr` must be executable on `PATH`; `HERDR` may select another executable. |
| [agmsg](https://github.com/j5ik2o/agmsg) | 1.1.6 | Install the skill at `$HOME/.agents/skills/agmsg`; its scripts must be executable. `AGMSG_ROOT` and the documented script overrides may select another installation. |

These are the versions verified for this guide, not an ongoing compatibility
guarantee. Installing, upgrading, and placing all three tools where the launcher
can resolve them is the user's responsibility. Amadeus does not bundle them or
guarantee their installation channels.

Check the installation before creating a team:

```text
$amadeus --doctor
```

The health report includes an advisory section without changing the doctor's
existing pass/fail result:

```text
Team Mode prerequisites:
  herdr: /resolved/path/to/herdr
  agmsg: /resolved/path/to/send.sh
```

A missing tool is shown as `not found` followed by its official source and a
link back to this guide. The launcher performs the same checks before creating
worktrees or a herdr session, and fails early on unsupported operating systems
or a missing prerequisite.

## Setup

Run the launcher from an installed harness. `{{HARNESS_DIR}}` means the active
harness directory, such as `.claude` or `.codex`:

```bash
# Claude members; six engineers by default
bash {{HARNESS_DIR}}/tools/team-up.sh

# Codex members
bash {{HARNESS_DIR}}/tools/team-up.sh --codex

# A smaller team, or an independently named team
bash {{HARNESS_DIR}}/tools/team-up.sh -4
bash {{HARNESS_DIR}}/tools/team-up.sh --instance alpha
```

The launcher sets the team identity and messaging environment for every member.
Choose a messaging backend only when creating a fresh run; `agmsg` is the
default and the selection is retained when the run is resumed:

```bash
bash {{HARNESS_DIR}}/tools/team-up.sh --msg agmsg
bash {{HARNESS_DIR}}/tools/team-up.sh --msg herdr
```

Send or inspect a message through the same installed tool directory:

```bash
bash {{HARNESS_DIR}}/tools/team-msg.sh send e1 "Please review the proposal."
bash {{HARNESS_DIR}}/tools/team-msg.sh read leader
```

Roles use `leader`, `e1`, `e2`, and so on. For backend details, delivery
semantics, and resume behavior, see [Team Messaging Backend](team-messaging.md).

## Running an election

The distributed `amadeus-election` skill drives the CLI as a directive loop.
Prepare an election definition with `electionId`, `kind`, `question`, `choices`,
and `voters`, then open it:

```json
{
  "electionId": "E-EXAMPLE-1",
  "kind": "zero-confirm",
  "question": "Approve the proposal?",
  "choices": [{ "internalNo": 1, "label": "approve" }],
  "voters": ["e1"]
}
```

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

`AMADEUS_OPERATING_MODE=team` is the sole mode marker. The team launcher sets it
for launched sessions; its absence selects solo mode. A messaging registration,
member count, or saved session is not evidence that Team Mode is active.

Both modes keep the same rule layers, evidence requirements, verification
standards, and escalation boundaries. Team Mode assigns coordination,
independent review, worktree isolation, and elections across members; solo mode
performs applicable responsibilities sequentially and never invents absent
members or votes.

This section is a user-facing summary. The team's `memory/team.md` is the
normative source for operating practices and may specialize them for a
workspace.

## Platform support

The team launcher supports:

- macOS (`Darwin`)
- Linux

Windows is outside the Team Mode support boundary. The launcher rejects any
other operating system before probing herdr or agmsg and before creating team
state. This restriction applies to the team launcher, not to every standalone
Amadeus command.
