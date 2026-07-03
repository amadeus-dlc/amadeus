---
name: amadeus-construction-ci-pipeline
description: >-
  Internal Amadeus Construction skill. Use only for Stage 3.7 CI Pipeline, per
  Intent. Use when an Intent needs a new CI pipeline or a large change to one,
  and must create or repair ci-config.md and quality-gates.md. Do not run when
  sufficient CI already exists. Do not create implementation or Bolt records.
---

# amadeus-construction-ci-pipeline

## Purpose

Advance only Construction Stage 3.7 CI Pipeline, per Intent.

This is an internal skill called from the `amadeus` entrypoint.

Design the CI configuration and quality gates from the build and test
results. Follow the team practices confirmed in Practices Discovery for the
CI trigger design (push, PR, tag).

## Prerequisites

Assume the target record's `aidlc-state.md` has `ci-pipeline` as an
executable Stage Progress item, with the checkbox in one of these states:
`[ ]`, `[-]`, `[?]`, or `[R]`.

If the checkbox is `[?]`, resume from gate presentation without recreating
the artifacts.

If the checkbox is `[R]`, present the previous artifacts and the requested
changes, then make only the necessary corrections.

In both cases, do not restart the whole procedure.

The Condition is: a new CI pipeline or a large change to one is needed.

If sufficient CI already exists, create no artifacts. Set the `ci-pipeline`
checkbox to `[S]`, write the skip reason in the note, append a
`STAGE_SKIPPED` event to `audit/audit.md`, and return to `amadeus`.

Confirm that all Bolts are complete. If any Bolt is incomplete, stop and
return to `amadeus`.

Read at least the following inputs:

- `build-and-test-summary.md` and `build-test-results.md` under
  `construction/bolts/`
- `inception/practices-discovery/team-practices.md`, if it was executed
- `aidlc-state.md`

## Questions

Treat questions during Construction as exceptional.

Ask only when you detect a real gap that earlier artifacts did not cover,
using the `amadeus-grilling` protocol and asking one question at a time.

If you ask questions, record them in
`construction/ci-pipeline/ci-pipeline-questions.md`.

## Templates

Use templates in this priority order:

1. `aidlc/spaces/<space>/memory/templates/intents/construction/ci-pipeline/`
2. `templates/construction/ci-pipeline/` bundled with this skill.

Do not leave unknown items blank. Write `未確認`.

## Artifacts

Create or update only the following files:

- `construction/ci-pipeline/ci-config.md` (CI configuration design)
- `construction/ci-pipeline/quality-gates.md` (quality gates)
- `construction/ci-pipeline/memory.md`
- `aidlc-state.md` for the `ci-pipeline` checkbox and `audit/audit.md` for
  gate events
- `construction/ci-pipeline/ci-pipeline-questions.md`, only if questions were
  asked

## Procedure

The following procedure applies when starting from checkbox `[ ]`.

When resuming from `[?]` or `[R]`, follow the prerequisite resume rules and
run only the steps needed for gate presentation or correction.

1. Only when the checkbox is `[ ]`, evaluate the Condition. If sufficient CI
   already exists, set it to `[S]`, write the skip reason in the note,
   append `STAGE_SKIPPED` to `audit/audit.md`, and stop. Do not reevaluate
   when resuming from `[-]`, `[?]`, or `[R]`.
2. Set the `ci-pipeline` checkbox to `[-]`.
3. Read the Bolt build and test records and team practices, and ask
   questions only for real gaps.
4. Create `ci-config.md` and `quality-gates.md`.
5. Record interpretations, deviations, tradeoffs, and unresolved questions in
   `construction/ci-pipeline/memory.md`.
6. Set the `ci-pipeline` checkbox to `[?]`, append `STAGE_AWAITING_APPROVAL`
   to `audit/audit.md`, and present the gate.

## Gate

Show an artifact summary and the paths to review, then ask for approval with
exactly two options: Approve or Request Changes.

Construction gates are limited to those two options. Do not offer additional
execution for skipped stages as a gate option.

If Request Changes happens three times in a row, add Accept as-is as an
option.

When presenting a gate, wait for the human response in that turn.

When approved, set the `ci-pipeline` checkbox to `[x]`, and append
`GATE_APPROVED` (with the human response recorded as-is) and
`STAGE_COMPLETED` to `audit/audit.md`.

When changes are requested, set the `ci-pipeline` checkbox to `[R]`, and
append `GATE_REJECTED` (with the requested changes recorded as-is) and
`STAGE_REVISING`.

If Accept as-is is selected, set the `ci-pipeline` checkbox to `[x]`, append
`GATE_APPROVED` (noting Accept as-is) and `STAGE_COMPLETED`, and record the
decision in `construction/decisions.md`.

## Prohibitions

- Do not run before all Bolts are complete.
- Do not design a CI trigger that conflicts with team practices. If a
  conflict exists, ask the human.
- Do not create implementation, test execution, or Bolt records.
- Do not set the checkbox to `[x]` before approval.

## Next Skill

- Continue the workflow: `amadeus`, which resolves the Construction phase
  boundary processing.
- Validate artifact structure: `amadeus-validator`.
