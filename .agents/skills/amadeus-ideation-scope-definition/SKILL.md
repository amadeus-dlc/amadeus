---
name: amadeus-ideation-scope-definition
description: >-
  Internal Amadeus Ideation skill. Use only for Stage 1.4 Scope Definition.
  Use when you must define the target Intent's in-scope and out-of-scope
  boundaries, organize work candidates within the theme into a prioritized
  scope backlog, and create or repair scope-document.md and
  intent-backlog.md. Do not raise work deferred this time as a separate
  Intent. Do not create requirements, Units, Bolts, or implementation.
---

# amadeus-ideation-scope-definition

## Purpose

Advance only Ideation Stage 1.4 Scope Definition.

This is an internal skill called from the `amadeus` entrypoint.

Define the in-scope and out-of-scope boundaries, confirm the minimum scope
that delivers value, and organize work candidates within the theme into a
prioritized scope backlog.
The scope backlog is a holding place for "work not done this time," not a
reserved seat for a future Intent.

## Prerequisites

Assume the target record's `aidlc-state.md` has `scope-definition` as an
executable Stage Progress item, and the checkbox is one of `[ ]`, `[-]`,
`[?]`, or `[R]`.

If the checkbox is `[?]`, resume from gate presentation without recreating
the artifacts.
If the checkbox is `[R]`, present the previous artifacts and the requested
changes, then make only the necessary corrections.
In both cases, do not restart the whole procedure.

Read at least the following inputs:

- `aidlc/spaces/<space>/intents/<dirName>.md`
- `aidlc-state.md`
- `ideation/feasibility/` (if executed; especially `constraint-register.md`)
- the Space's `memory/` and `knowledge/`

## Questions

Confirm the following points:

- How far does the minimum scope that delivers value extend?
- Which work candidates are must-have and which are nice-to-have?
- Are there dependencies among work candidates?
- What is the preferred ordering (risk-first, value-first,
  dependency-first)?
- Are there deadlines tied to specific work candidates?

Follow the `amadeus-grilling` protocol: ask one question at a time with a
recommended answer attached, and wait for the response.
Use `aidlc-state.md`'s `Depth` as the guide for how many questions to ask.
Record the questions and answers in
`ideation/scope-definition/scope-definition-questions.md`.
Also record scope-confirmation decisions in `ideation/grillings.md` and
`ideation/grillings/Gxxx-<topic>.md`.

## Templates

Use templates in this priority order:

1. `aidlc/spaces/<space>/memory/templates/intents/ideation/scope-definition/`
2. `templates/ideation/scope-definition/` bundled with this skill.

Do not leave unknown items blank. Write `未確認`.

## Artifacts

Create or update only the following files:

- `ideation/scope-definition/scope-document.md`
- `ideation/scope-definition/intent-backlog.md`
- `ideation/scope-definition/scope-definition-questions.md`
- `ideation/scope-definition/memory.md` (the stage execution learning
  record)
- `aidlc-state.md` for the target stage checkbox and `audit/audit.md` for
  gate event entries

Write scope backlog items as proto-Units and prioritize them using MoSCoW
as the baseline. Use WSJF or RICE when needed.

## Procedure

The following procedure applies when starting from checkbox `[ ]`.
When resuming from `[?]` or `[R]`, follow the prerequisite resume rules and
run only the steps needed for gate presentation or correction.

1. Set the `scope-definition` checkbox in `aidlc-state.md` to `[-]`.
2. Read the Intent's module files, constraints, and the Space's `memory/`
   and `knowledge/`, and identify work candidates within the theme.
3. Ask questions to confirm any gaps.
4. Write the in-scope and out-of-scope boundaries in `scope-document.md`.
5. In `intent-backlog.md`, write the work candidates excluded from this
   scope and the future candidates, prioritized.
6. Record the interpretations, deviations, tradeoffs, and unresolved
   questions from the stage's execution in `memory.md`.
7. Set the `scope-definition` checkbox in `aidlc-state.md` to `[?]`,
   append a `STAGE_AWAITING_APPROVAL` event to `audit/audit.md`, and
   present the gate.

## Gate

Show an artifact summary and the paths to review, then ask for approval
with exactly two options: Approve or Request Changes.
In Ideation stages, executing an additional skipped stage can be offered
as a third option.
If executing an additional skipped stage is selected, revert the target
stage's checkbox from `[S]` to `[ ]`, revert the skip note to `EXECUTE`,
and return to the `amadeus` entrypoint. The entrypoint selects the target
stage at the next resolution.
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
`GATE_APPROVED` (recording that it is Accept as-is) and
`STAGE_COMPLETED`, and record this decision in `ideation/decisions.md`.

AI-DLC v2 declares the `required-sections` and `upstream-coverage` sensors
for this stage. Amadeus DLC runs no sensor mechanism: `required-sections`
maps to `amadeus-validator` structural validation, and `upstream-coverage`
maps to this stage's required inputs and the phase's `traceability.md`. See
`docs/amadeus/aidlc-v2-sensor-learn-mapping.md`.

## Prohibitions

- Do not raise backlog items as new Intents. Only the `amadeus`
  entrypoint's Intake decides whether to create an Intent.
- Do not implicitly discard out-of-scope work. Record every recognized
  work candidate in the backlog.
- Do not create requirements, Units, Bolts, or implementation.
- Do not record `completed` before approval.

## Next Skill

- Continue: `amadeus`, which resolves the next stage.
- Validate artifact structure: `amadeus-validator`.
