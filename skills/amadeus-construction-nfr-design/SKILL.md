---
name: amadeus-construction-nfr-design
description: >-
  Internal Amadeus Construction skill. Use only for Stage 3.3 NFR Design, per
  Unit. Use when a Unit that ran NFR Requirements needs NFR pattern design,
  and must create or repair the five NFR design artifacts. Do not run when
  NFR Requirements was not executed. Do not implement code.
---

# amadeus-construction-nfr-design

## Purpose

Advance only Construction Stage 3.3 NFR Design for the target Unit.

This is an internal skill called from the `amadeus` entrypoint while a Bolt is
being executed.

Create designs that satisfy the NFR requirements: performance, security,
scalability, reliability, and logical components.

## Prerequisites

Assume the target record's `aidlc-state.md` has `nfr-design` as an executable
Stage Progress item, and the CONSTRUCTION PHASE `Per unit: <unit-id>` block
has the `nfr-design` checkbox in one of these states: `[ ]`, `[-]`, `[?]`, or
`[R]`.

If the checkbox is `[?]`, resume from gate presentation without recreating the
artifacts.

If the checkbox is `[R]`, present the previous artifacts and the requested
changes, then make only the necessary corrections.

In both cases, do not restart the whole procedure.

The Condition is: NFR Requirements was executed and the Unit needs NFR
pattern design.

If NFR Requirements was not executed, create no artifacts. Set the target
Unit checkbox to `[S]`, write the skip reason in the note, append a
`STAGE_SKIPPED` event to `audit/audit.md`, and return to `amadeus`.

Read at least the following inputs:

- The five artifacts under `construction/<unit-id>-<slug>/nfr-requirements/`
  (required)
- `construction/<unit-id>-<slug>/functional-design/business-logic-model.md`,
  if Functional Design was executed
- `aidlc-state.md`

## Questions

Treat questions during Construction as exceptional.

Ask only when you detect a real gap that earlier artifacts did not cover. Use
the `amadeus-grilling` protocol and ask one question at a time.

If you ask questions, record them in
`construction/<unit-id>-<slug>/nfr-design/nfr-design-questions.md`.

## Templates

Use templates in this priority order:

1. `aidlc/spaces/<space>/memory/templates/intents/construction/nfr-design/`
2. `templates/construction/nfr-design/` bundled with this skill.

Do not leave unknown items blank. Write `未確認`.

## Artifacts

Create or update only the following files:

- `construction/<unit-id>-<slug>/nfr-design/performance-design.md`
- `construction/<unit-id>-<slug>/nfr-design/security-design.md`
- `construction/<unit-id>-<slug>/nfr-design/scalability-design.md`
- `construction/<unit-id>-<slug>/nfr-design/reliability-design.md`
- `construction/<unit-id>-<slug>/nfr-design/logical-components.md`
- `construction/<unit-id>-<slug>/nfr-design/memory.md`
- `aidlc-state.md` for the target Unit checkbox and `audit/audit.md` for gate
  events
- `construction/<unit-id>-<slug>/nfr-design/nfr-design-questions.md`, only if
  questions were asked

## Procedure

The following procedure applies when starting from checkbox `[ ]`.

When resuming from `[?]` or `[R]`, follow the prerequisite resume rules and
run only the steps needed for gate presentation or correction.

1. Only when the checkbox is `[ ]`, evaluate the Condition. If it is false,
   set the target Unit to `[S]`, write the skip reason in the note, append
   `STAGE_SKIPPED` to `audit/audit.md`, and stop. Do not reevaluate when
   resuming from `[-]`, `[?]`, or `[R]`.
2. Set the target Unit's `nfr-design` checkbox to `[-]`.
3. Read the inputs and ask questions only for real gaps.
4. Create the artifacts.
5. Record interpretations, deviations, tradeoffs, and unresolved questions in
   `construction/<unit-id>-<slug>/nfr-design/memory.md`.
6. Set the target Unit checkbox to `[?]`, append `STAGE_AWAITING_APPROVAL` to
   `audit/audit.md`, and present the gate.

## Gate

Show an artifact summary and the paths to review, then ask for approval with
exactly two options: Approve or Request Changes.

Construction gates are limited to those two options. Do not offer additional
execution for skipped stages as a gate option.

If Request Changes happens three times in a row, add Accept as-is as an
option.

When presenting a gate, wait for the human response in that turn.

If `aidlc-state.md` has `Construction Autonomy Mode: autonomous` and the
target Bolt is not a walking skeleton, do not present the gate. Continue to
the next stage.

In that case, approval evidence is recorded after the Bolt PR is merged: the
`amadeus` entrypoint's Bolt boundary processing records `STAGE_COMPLETED`
with the PR URL in Details.

If you detect a failure or real gap, stop and ask the human regardless of
autonomy mode.

When approved, set the target Unit checkbox to `[x]`, append `GATE_APPROVED`
with the human response recorded as-is, and append `STAGE_COMPLETED` to
`audit/audit.md`.

When changes are requested, set the target Unit checkbox to `[R]`, append
`GATE_REJECTED` with the requested changes recorded as-is, and append
`STAGE_REVISING`.

If Accept as-is is selected, set the target Unit checkbox to `[x]`, append
`GATE_APPROVED` noting Accept as-is, append `STAGE_COMPLETED`, and record the
decision in `construction/decisions.md`.

## Prohibitions

- Do not run without the NFR Requirements artifacts.
- Do not implement code or test code.
- Do not record `completed` without approval.

## Next Skill

- Continue the Bolt: `amadeus`, which resolves the next stage inside the
  Bolt.
- Validate artifact structure: `amadeus-validator`.
