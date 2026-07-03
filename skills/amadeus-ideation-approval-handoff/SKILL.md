---
name: amadeus-ideation-approval-handoff
description: >-
  Internal Amadeus Ideation skill. Use only for Stage 1.7 Approval & Handoff.
  Use when Ideation's artifacts must be consolidated into
  initiative-brief.md, the phase's decisions.md and traceability.md
  finalized, and handoff approval to Inception and the phase PR advanced.
  Do not create Inception artifacts, requirements, Units, Bolts, or
  implementation.
---

# amadeus-ideation-approval-handoff

## Purpose

Advance only Ideation Stage 1.7 Approval & Handoff.

This is an internal skill called from the `amadeus` entrypoint.

Consolidate all Ideation artifacts into the initiative brief, finalize the
phase's decision records and traceability, and obtain approval for handoff to
Inception.

## Prerequisites

Assume the target record's `aidlc-state.md` has `approval-handoff` as an
executable Stage Progress item, and its checkbox is in one of these states:
`[ ]`, `[-]`, `[?]`, or `[R]`.

If the checkbox is `[?]`, resume from gate presentation without recreating
the artifacts.

If the checkbox is `[R]`, present the previous artifacts and the reason for
the requested changes, then make only the necessary corrections.

In both cases, do not restart the whole procedure.

Confirm that all other executable Ideation stages have checkbox `[x]` or
`[S]`.

The Ideation stages are `intent-capture`, `market-research`, `feasibility`,
`scope-definition`, `team-formation`, `rough-mockups`, and
`approval-handoff`; treat these checkboxes in the IDEATION PHASE of the Stage
Progress in `aidlc-state.md` as the confirmation targets.

Stages from Inception onward (`reverse-engineering` and later) are normal
while `[ ]` and are not confirmation targets.

Read at least the following:

- `aidlc/spaces/<space>/intents/<dirName>.md`
- `aidlc-state.md`
- All stage artifacts under `ideation/`
- `ideation/grillings.md`, if it exists

## Templates

Use templates in this priority order:

1. `aidlc/spaces/<space>/memory/templates/intents/ideation/approval-handoff/`
2. `templates/ideation/approval-handoff/` bundled with this skill.

Do not leave unknown items blank. Write `未確認`.

For items corresponding to a stage that was not executed (mockups, team
formation, etc.), write `該当なし` instead of linking to a file that does not
exist.

## Artifacts

Create or update only the following files:

- `ideation/approval-handoff/initiative-brief.md`
- `ideation/decisions.md` and `ideation/decisions/D001-<slug>.md` onward
- `ideation/traceability.md`
- `ideation/approval-handoff/approval-handoff-questions.md`
- `ideation/approval-handoff/memory.md`
- `aidlc-state.md` for the `approval-handoff` checkbox, and `audit/audit.md`
  for gate events

The initiative brief consolidates the Intent's purpose, success criteria,
scope boundaries, backlog summary, constraints, team formation, and mockup
references into one document that Inception reads first.

Record decisions finalized during Ideation in decisions.

Record the mapping from success criteria to Ideation artifacts in
traceability.

## Procedure

The following procedure applies when starting from checkbox `[ ]`.

When resuming from `[?]` or `[R]`, follow the prerequisite resume rules and
run only the steps needed to re-present the gate or make corrections.

1. Confirm that all executable Ideation stages (the slugs listed in
   Prerequisites) have checkbox `[x]` or `[S]`. If any are incomplete, stop
   and return to `amadeus`. Do not use the state of Inception-onward stages
   in this determination.
2. Set the `approval-handoff` checkbox in `aidlc-state.md` to `[-]`.
3. Read all stage artifacts and detect contradictions or remaining `未確認`
   items. For remainders that need judgment, confirm one question at a time
   and record them in `approval-handoff-questions.md`.
4. Create `initiative-brief.md`.
5. Finalize `decisions.md`, the individual decisions, and `traceability.md`.
6. Record interpretations, deviations, tradeoffs, and unresolved questions
   from this execution in the stage's `memory.md`.
7. Set the `approval-handoff` checkbox in `aidlc-state.md` to `[?]`, append
   a `STAGE_AWAITING_APPROVAL` event to `audit/audit.md`, and present the
   gate.
8. After approval, return to the `amadeus` entrypoint. Guiding the phase PR,
   recording Ideation's `PHASE_VERIFIED` event, and transitioning Phase
   Progress are the `amadeus` entrypoint's responsibility; this skill does
   not perform them.

## Gate

Show a summary of the initiative brief and the paths to review, then ask for
approval with exactly two options: Approve or Request Changes.

If Request Changes happens three times in a row, add Accept as-is as an
option.

When presenting a gate, wait for the human response in that turn.

When approved, set the checkbox to `[x]`, and append `GATE_APPROVED`
(recording the human response as-is) and `STAGE_COMPLETED` to
`audit/audit.md`.

When changes are requested, set the checkbox to `[R]`, and append
`GATE_REJECTED` (recording the requested changes as-is) and
`STAGE_REVISING`.

If Accept as-is is selected, set the checkbox to `[x]`, append
`GATE_APPROVED` (noting Accept as-is) and `STAGE_COMPLETED`, and record this
decision in `ideation/decisions.md`.

## Prohibitions

- Do not skip incomplete Ideation stages and consolidate anyway.
- Do not create Inception artifacts (requirements, stories, design, Units,
  Bolts).
- Do not record the `PHASE_VERIFIED` event or transition Phase Progress in
  this skill. Phase boundary processing is the `amadeus` entrypoint's
  responsibility.
- Do not record `completed` without waiting for approval.

## Next Skill

- Continue: `amadeus`, which resolves the Inception stage.
- Validate artifact structure: `amadeus-validator`.
