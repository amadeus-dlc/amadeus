---
name: amadeus-ideation-feasibility
description: >-
  Internal Amadeus Ideation skill. Use only for Stage 1.3 Feasibility. Use
  when the target Intent has integration constraints, regulatory
  requirements, or significant technical uncertainty, and must create or
  repair feasibility-assessment.md, constraint-register.md, and raid-log.md.
  Do not run for minor changes without technical risk. Do not create
  scope-document, requirements, or implementation.
---

# amadeus-ideation-feasibility

## Purpose

Advance only Ideation Stage 1.3 Feasibility.

This is an internal skill called from the `amadeus` entrypoint.

Evaluate feasibility from the perspectives of technology, operations,
security, and dependencies, and register non-negotiable constraints and
risks. Registering constraints is an artifact that passes judgment material
to later decomposition without writing the how.

## Prerequisites

Assume the target record's `aidlc-state.md` has `feasibility` as an
executable Stage Progress item, and the checkbox is in one of these states:
`[ ]`, `[-]`, `[?]`, or `[R]`.

If the checkbox is `[?]`, resume from gate presentation without recreating
the artifacts.

If the checkbox is `[R]`, present the previous artifacts and the reason for
the requested changes, then make only the necessary corrections.

In both cases, do not restart the procedure from the beginning.

The Condition is: there are integration constraints, regulatory
requirements, or significant technical uncertainty.

If the Condition is false, create no artifacts, set the checkbox to `[S]`,
write the skip reason in the note, append a `STAGE_SKIPPED` event to
`audit/audit.md`, and return to `amadeus`.

Read at least the following:

- `aidlc/spaces/<space>/intents/<dirName>.md`
- `aidlc-state.md`
- `ideation/market-research/`, if it was executed
- the Space's `memory/` and `knowledge/`

## Questions

Confirm the following points:

- Where is there uncertainty in technology, operations, security, or
  dependencies?
- What are the non-negotiable constraints (existing architecture,
  deadlines, compliance, things not to do)?
- Among risks, assumptions, issues, and external dependencies, which ones
  affect later decisions?

Follow the `amadeus-grilling` protocol: ask one question at a time, attach a
recommended answer, and wait for the response.

Use `aidlc-state.md`'s `Depth` as a guide for the number of questions.

Record questions and answers in
`ideation/feasibility/feasibility-questions.md`.

## Templates

Use templates in this priority order:

1. `aidlc/spaces/<space>/memory/templates/intents/ideation/feasibility/`
2. `templates/ideation/feasibility/` bundled with this skill.

Do not leave unknown items blank. Write `未確認`.

## Artifacts

Create or update only the following files:

- `ideation/feasibility/feasibility-assessment.md`
- `ideation/feasibility/constraint-register.md`
- `ideation/feasibility/raid-log.md`
- `ideation/feasibility/feasibility-questions.md`
- `ideation/feasibility/memory.md` (the learning record of the stage
  execution)
- `aidlc-state.md` (the target stage's checkbox) and `audit/audit.md`
  (appending gate events)

## Procedure

The following procedure applies when starting from checkbox `[ ]`.

When resuming from `[?]` or `[R]`, follow the prerequisite resume rules and
run only the steps needed for gate re-presentation or correction.

1. Only when the checkbox is `[ ]`, evaluate the Condition. If it is false,
   set the checkbox to `[S]`, write the skip reason in the note, append
   `STAGE_SKIPPED` to `audit/audit.md`, and stop. Do not reevaluate when
   resuming from `[-]`, `[?]`, or `[R]`.
2. Set `aidlc-state.md`'s `feasibility` checkbox to `[-]`.
3. Read the Intent's module files, the market-research artifacts, and the
   Space's `memory/` and `knowledge/`, and confirm missing points with
   questions.
4. Create the three artifacts.
5. Record interpretations, deviations, tradeoffs, and unresolved questions
   made during execution in the stage's `memory.md`.
6. Set `aidlc-state.md`'s `feasibility` checkbox to `[?]`, append a
   `STAGE_AWAITING_APPROVAL` event to `audit/audit.md`, and present the
   gate.

## Gate

Show an artifact summary and the paths to review, then ask for approval
with exactly two options: Approve or Request Changes.

In Ideation stages, additional execution of a skipped stage can be a third
option.

If additional execution of a skipped stage is selected, revert the target
stage's checkbox from `[S]` to `[ ]`, revert the skip note to `EXECUTE`, and
return to the `amadeus` entrypoint. The entrypoint selects the target stage
in its next resolution.

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

AI-DLC v2 declares the `required-sections` and `upstream-coverage` sensors
for this stage. Amadeus DLC runs no sensor mechanism: `required-sections`
maps to `amadeus-validator` structural validation, and `upstream-coverage`
maps to this stage's required inputs and the phase's `traceability.md`. See
`docs/amadeus/aidlc-v2-sensor-learn-mapping.md`.

## Prohibitions

- Do not finalize the design of implementation means (architecture,
  implementation approach). Limit the work to recording constraints and
  assessments.
- Do not create `scope-document.md`, `intent-backlog.md`, requirements, or
  implementation.
- Do not record `completed` without waiting for approval.

## Next Skill

- Continue: `amadeus` (the entrypoint resolves the next stage).
- Validate artifact structure: `amadeus-validator`.
