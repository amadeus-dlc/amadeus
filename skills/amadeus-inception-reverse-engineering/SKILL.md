---
name: amadeus-inception-reverse-engineering
description: >-
  Internal Amadeus Inception skill. Use only for Stage 2.1 Reverse
  Engineering. Use when the target Intent is brownfield and must create or
  update the existing codebase's business overview, architecture, code
  structure, API, component inventory, technology stack, dependencies, and
  quality assessment under `aidlc/spaces/<space>/codekb/<repo>/`. Do not run
  for greenfield. Do not create requirements, design, Units, Bolts, or
  implementation.
---

# amadeus-inception-reverse-engineering

## Purpose

Advance only Inception Stage 2.1 Reverse Engineering.

This is an internal skill called from the `amadeus` entrypoint.

Analyze the existing codebase and record codebase knowledge under the Space's
`codekb/` that later stages and other Intents can reuse.

## Prerequisites

Assume the target record's `aidlc-state.md` has `reverse-engineering` as an
executable Stage Progress item, and the checkbox is in one of these states:
`[ ]`, `[-]`, `[?]`, or `[R]`.

If the checkbox is `[?]`, resume from gate presentation without recreating
the artifacts.

If the checkbox is `[R]`, present the previous artifacts and the requested
changes, then make only the necessary corrections.

In both cases, do not restart the whole procedure.

The Condition is: the case is brownfield (existing code subject to change
exists).

For greenfield, create no artifacts. Set the checkbox to `[S]`, write the
skip reason in the note, append a `STAGE_SKIPPED` event to `audit/audit.md`,
and return to `amadeus`.

Even when `aidlc/spaces/<space>/codekb/<repo>/` already exists, inspect its
content to keep it fresh and update outdated descriptions.

## Templates

Use templates in this priority order:

1. `aidlc/spaces/<space>/memory/templates/codekb/`
2. `templates/codekb/` bundled with this skill.

Do not leave unknown items blank. Write `未確認`.

## Artifacts

Create or update only the following files:

Placed under the Space's `aidlc/spaces/<space>/codekb/<repo>/`:

- `business-overview.md`
- `architecture.md`
- `code-structure.md`
- `api-documentation.md`
- `component-inventory.md`
- `technology-stack.md`
- `dependencies.md`
- `code-quality-assessment.md`
- `timestamp.md` (analysis time and target commit)

Placed under the Intent:

- `aidlc-state.md` (the target stage checkbox) and `audit/audit.md` (append
  gate events)
- `inception/reverse-engineering/memory.md` (learning record of the stage
  execution)
- `inception/reverse-engineering/reverse-engineering-questions.md`, only if
  questions were asked

## Procedure

The following procedure applies when starting from checkbox `[ ]`.

When resuming from `[?]` or `[R]`, follow the prerequisite resume rules and
run only the steps needed for gate re-presentation or correction.

1. Only when the checkbox is `[ ]`, evaluate the Condition. If greenfield,
   set the checkbox to `[S]`, write the skip reason in the note, append
   `STAGE_SKIPPED` to `audit/audit.md`, and stop. Do not reevaluate when
   resuming from `[-]`, `[?]`, or `[R]`.
2. Set the `reverse-engineering` checkbox in `aidlc-state.md` to `[-]`.
3. Analyze the target repository's code and create or update the nine
   artifacts under `aidlc/spaces/<space>/codekb/<repo>/`.
4. Record the analysis time and target commit in `timestamp.md`.
5. Record interpretations, deviations, tradeoffs, and unresolved questions
   from the execution in the stage's `memory.md`.
6. Set the `reverse-engineering` checkbox in `aidlc-state.md` to `[?]`,
   append a `STAGE_AWAITING_APPROVAL` event to `audit/audit.md`, and present
   the gate.

Perform the analysis as read-only; do not modify the target code.

For large-scale cases, you may delegate the analysis to a subagent.

## Gate

Show an artifact summary and the paths to review, then ask for approval with
exactly two options: Approve or Request Changes.

For Inception stages, you can add executing a skipped stage as a third
option.

If executing a skipped stage is selected, revert the target stage's
checkbox from `[S]` to `[ ]`, revert the skip note to `EXECUTE`, and return
to the `amadeus` entrypoint. The entrypoint selects the target stage on the
next resolution.

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
decision in `inception/decisions.md`.

AI-DLC v2 declares the `required-sections` and `upstream-coverage` sensors
for this stage. Amadeus DLC runs no sensor mechanism: `required-sections`
maps to `amadeus-validator` structural validation, and `upstream-coverage`
maps to this stage's required inputs and the phase's `traceability.md`. See
`docs/amadeus/aidlc-v2-sensor-learn-mapping.md`.

## Prohibitions

- Do not run for greenfield.
- Do not modify the target code.
- Do not place artifacts under the Intent (e.g. `inception/`). Only
  `reverse-engineering-questions.md` is placed under the Intent.
- Do not create requirements, design, Units, Bolts, or implementation.
- Do not record `completed` without waiting for approval.

## Next Skill

- Continue: `amadeus`, which resolves the next stage.
- Validate artifact structure: `amadeus-validator`.
