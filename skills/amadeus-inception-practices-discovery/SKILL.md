---
name: amadeus-inception-practices-discovery
description: >-
  Internal Amadeus Inception skill. Use only for Stage 2.2 Practices Discovery.
  Use when the target Intent needs the team's development practices (branch
  strategy, testing policy, deployment, quality standards) discovered with
  evidence, and must create or update team-practices.md, discovered-rules.md,
  and evidence.md. Promotion into memory/ (team.md, project.md) requires human
  approval. Do not create requirements, design, Units, Bolts, or
  implementation.
---

# amadeus-inception-practices-discovery

## Purpose

Advance only Inception Stage 2.2 Practices Discovery.

This is an internal skill called from the `amadeus` entrypoint.

Discover the team's development practices, record them with evidence, and
promote the items the human confirms into the Space's `memory/` (team.md,
project.md).

## Prerequisites

Assume the target record's `aidlc-state.md` has `practices-discovery` as an
executable Stage Progress item, with the checkbox in one of these states:
`[ ]`, `[-]`, `[?]`, or `[R]`.

If the checkbox is `[?]`, resume from gate presentation without recreating the
artifacts.

If the checkbox is `[R]`, present the previous artifacts and the requested
changes, then make only the necessary corrections.

In both cases, do not restart the whole procedure.

The Condition is: re-execute every time, to keep the discovery current. When
scope makes this stage executable, do not skip it. Even when a previous
discovery result exists, re-check it and update stale descriptions. For
brownfield, discover from the Reverse Engineering artifacts and evidence in
the repo. For greenfield, confirm with questions.

Read at least the following inputs:

- `aidlc/spaces/<space>/codekb/<repo>/` (for brownfield)
- The Space's `memory/team.md` and `memory/project.md` (existing policies)
- `aidlc-state.md`

## Questions

For greenfield, or for points that cannot be judged from evidence, confirm the
following:

- What is the branch strategy and the unit of a PR?
- What is the testing policy and the quality standard?
- What triggers deployment and CI?

Ask questions using the `amadeus-grilling` protocol, one question at a time,
each with a recommended answer, and wait for the response. Use
`aidlc-state.md`'s `Depth` as a guide for the amount of questions. If you ask
questions, record them in
`inception/practices-discovery/practices-discovery-questions.md`.

## Templates

Use templates in this priority order:

1. `aidlc/spaces/<space>/memory/templates/intents/inception/practices-discovery/`
2. `templates/inception/practices-discovery/` bundled with this skill.

Do not leave unknown items blank. Write `未確認`.

## Artifacts

Create or update only the following files:

- `inception/practices-discovery/team-practices.md`
- `inception/practices-discovery/discovered-rules.md`
- `inception/practices-discovery/evidence.md`
- `inception/practices-discovery/practices-discovery-timestamp.md`
- `inception/practices-discovery/memory.md` (the learning record of the stage
  execution)
- `aidlc-state.md` for the target stage checkbox and `audit/audit.md` for gate
  events
- `inception/practices-discovery/practices-discovery-questions.md`, only if
  questions were asked

## Procedure

The following procedure applies when starting from checkbox `[ ]`.

When resuming from `[?]` or `[R]`, follow the prerequisite resume rules and
run only the steps needed for gate presentation or correction.

1. Set the `practices-discovery` checkbox in `aidlc-state.md` to `[-]`.
2. For brownfield, extract practices from codebase knowledge and evidence in
   the repo (CI configuration, existing PRs, configuration files). For
   greenfield, confirm with questions.
3. Create `team-practices.md`, `discovered-rules.md`, `evidence.md`, and
   `practices-discovery-timestamp.md`.
4. Record the interpretations, deviations, tradeoffs, and unresolved questions
   from the execution in the stage's `memory.md`.
5. Set the `practices-discovery` checkbox in `aidlc-state.md` to `[?]`,
   append the `STAGE_AWAITING_APPROVAL` event to `audit/audit.md`, and present
   the gate.

Promote into `memory/team.md` and `memory/project.md` only after gate approval
(see the Gate section).

## Gate

Show an artifact summary and the paths to review, then ask for approval with
exactly two options: Approve or Request Changes.

In Inception stages, additional execution of an already-skipped stage can be
offered as a third option. When additional execution of a skipped stage is
selected, revert the target stage's checkbox from `[S]` to `[ ]`, revert the
skip note to `EXECUTE`, and return to the `amadeus` entrypoint. The entrypoint
selects the target stage on its next resolution.

If Request Changes happens three times in a row, add Accept as-is as an
option.

When presenting a gate, wait for the human response in that turn.

When approved, set the checkbox to `[x]`, and append `GATE_APPROVED` (with the
human response recorded as-is) and `STAGE_COMPLETED` to `audit/audit.md`.
After approval, propose promoting the confirmed practices into
`memory/team.md` and `memory/project.md`, and reflect only the items the human
approves.

When changes are requested, set the checkbox to `[R]`, and append
`GATE_REJECTED` (with the requested changes recorded as-is) and
`STAGE_REVISING`.

If Accept as-is is selected, set the checkbox to `[x]`, append
`GATE_APPROVED` (noting Accept as-is) and `STAGE_COMPLETED`, and record this
decision in `inception/decisions.md`.

## Prohibitions

- Do not change `memory/team.md` or `memory/project.md` without human
  approval.
- Do not write an unevidenced practice as confirmed. If there is no evidence,
  write `未確認`.
- Do not create requirements, design, Units, Bolts, or implementation.
- Do not record `completed` without waiting for approval.

## Next Skill

- Continue: `amadeus`, which resolves the next stage.
- Validate artifact structure: `amadeus-validator`.
