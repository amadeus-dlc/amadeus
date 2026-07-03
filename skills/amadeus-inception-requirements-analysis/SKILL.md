---
name: amadeus-inception-requirements-analysis
description: >-
  Internal Amadeus Inception skill. Use only for Stage 2.3 Requirements
  Analysis. Use when the target Intent must be broken down into verifiable
  requirements, and must create or repair requirements.md with identifiers
  and acceptance criteria. Do not create a standalone acceptance.md. Do not
  create stories, design, Units, Bolts, or implementation.
---

# amadeus-inception-requirements-analysis

## Purpose

Advance only Inception Stage 2.3 Requirements Analysis.

This is an internal skill called from the `amadeus` entrypoint.

Break down the Intent's success conditions into verifiable requirements with
identifiers and acceptance criteria. Depth follows the `Depth` value in
`aidlc-state.md`.

## Prerequisites

Assume the target record's `aidlc-state.md` has `requirements-analysis` as
an executable Stage Progress item, and its checkbox is in one of these
states: `[ ]`, `[-]`, `[?]`, or `[R]`.

If the checkbox is `[?]`, resume from gate presentation without recreating
the artifacts.

If the checkbox is `[R]`, present the previous artifacts and the requested
changes, then make only the necessary corrections.

In both cases, do not restart the whole procedure.

Read at least the following inputs:

- `aidlc/spaces/<space>/intents/<dirName>.md`
- `ideation/intent-capture/intent-statement.md`, if Intent Capture was
  executed. Use it as the source of the purpose, target, success conditions,
  and trigger. If it was not executed, use this stage's `requirements.md` as
  the source.
- `aidlc-state.md`
- `ideation/scope-definition/scope-document.md` and `intent-backlog.md`, if
  executed.
- `ideation/feasibility/constraint-register.md`, if executed.
- `aidlc/spaces/<space>/codekb/<repo>/`, for brownfield.
- `inception/practices-discovery/team-practices.md`, if executed.

## Questions

Confirm the following points.

- What information is missing to make the success conditions verifiable?
- How will each requirement's acceptance criteria be observed?
- Are there any ambiguous points at the boundary with out-of-scope items?

Ask questions following the `amadeus-grilling` protocol, one at a time, each
with a recommended answer, and wait for the response. Use `aidlc-state.md`'s
`Depth` as a guide for the number of questions.

Record questions and answers in
`inception/requirements-analysis/requirements-analysis-questions.md`. Also
record confirmed decisions that affect the meaning of requirements or later
judgment in `inception/grillings.md` and
`inception/grillings/Gxxx-<topic>.md`.

## Templates

Use templates in this priority order:

1. `aidlc/spaces/<space>/memory/templates/intents/inception/requirements-analysis/`
2. `templates/inception/requirements-analysis/` bundled with this skill.

Do not leave unknown items blank. Write `未確認`.

## Artifacts

Create or update only the following files:

- `inception/requirements-analysis/requirements.md` (the requirements list;
  include an identifier `R001` onward and acceptance criteria for each
  requirement)
- `inception/requirements-analysis/requirements-analysis-questions.md`
- `inception/requirements-analysis/memory.md` (the stage execution's
  learning record)
- `aidlc-state.md` for the target stage's checkbox and `audit/audit.md` for
  gate events

Acceptance criteria are embedded in each requirement. Do not create a
standalone `acceptance.md`. When there are many requirements, you may split
them into `requirements/<requirement-id>-<slug>.md`. Even then, keep
`requirements.md` as the index.

## Procedure

The following procedure applies when starting from checkbox `[ ]`.

When resuming from `[?]` or `[R]`, follow the prerequisite resume rules and
run only the steps needed for gate re-presentation or correction.

1. Set the `requirements-analysis` checkbox in `aidlc-state.md` to `[-]`.
2. Read the Intent's module files, `intent-statement.md`, scope boundaries,
   constraints, and codebase knowledge, and identify requirement candidates.
3. Confirm missing points through questions.
4. Create `requirements.md`. Make each requirement traceable from the
   success conditions.
5. Record interpretations, deviations, tradeoffs, and unresolved questions
   made during execution in the stage's `memory.md`.
6. Set the `requirements-analysis` checkbox in `aidlc-state.md` to `[?]`,
   append a `STAGE_AWAITING_APPROVAL` event to `audit/audit.md`, and present
   the gate.

## Gate

Show an artifact summary and the paths to review, then ask for approval
with exactly two options: Approve or Request Changes.

In Inception stages, executing a skipped stage can be added as a third
option. If executing a skipped stage is selected, revert the target stage's
checkbox from `[S]` to `[ ]`, revert the skip note to `EXECUTE`, and return
to the `amadeus` entrypoint. The entrypoint selects the target stage in its
next resolution.

If Request Changes happens three times in a row, add Accept as-is as an
option. When presenting a gate, wait for the human response in that turn.

When approved, set the checkbox to `[x]`, append `GATE_APPROVED` with the
human response recorded as-is, and append `STAGE_COMPLETED` to
`audit/audit.md`. When changes are requested, set the checkbox to `[R]`,
append `GATE_REJECTED` with the requested changes recorded as-is, and
append `STAGE_REVISING`. If Accept as-is is selected, set the checkbox to
`[x]`, append `GATE_APPROVED` noting Accept as-is, append `STAGE_COMPLETED`,
and record the decision in `inception/decisions.md`.

AI-DLC v2 assigns this stage `reviewer: aidlc-product-lead-agent` with
`reviewer_max_iterations: 2`. Amadeus DLC intentionally runs no reviewer
sub-agent: independent review maps to this gate's human approval and the
phase PR review, the Request Changes revision loop bounds the review
iterations, and `amadeus-validator` covers structural validation. See
`docs/amadeus/aidlc-v2-reviewer-mapping.md`.

AI-DLC v2 declares the `required-sections` and `upstream-coverage` sensors
for this stage. Amadeus DLC runs no sensor mechanism: `required-sections`
maps to `amadeus-validator` structural validation, and `upstream-coverage`
maps to this stage's required inputs and the phase's `traceability.md`. See
`docs/amadeus/aidlc-v2-sensor-learn-mapping.md`.

## Prohibitions

- Do not create a standalone `acceptance.md`. Acceptance criteria are
  embedded in each requirement.
- Do not write implementation means (design, implementation approach) into
  requirements.
- Do not create stories, Units, Bolts, or implementation.
- Do not record `completed` without waiting for approval.

## Next Skill

- Continue: `amadeus`, which resolves the next stage.
- Validate artifact structure: `amadeus-validator`.
