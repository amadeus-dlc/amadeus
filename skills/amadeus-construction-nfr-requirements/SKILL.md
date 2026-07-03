---
name: amadeus-construction-nfr-requirements
description: >-
  Internal Amadeus Construction skill. Use only for Stage 3.2 NFR Requirements,
  per Unit. Use when a Unit needs requirements and technology stack decisions
  for performance, security, scalability, and reliability, and must create or
  repair the five NFR requirement artifacts. Do not run when there are no NFRs
  and the technology stack is already decided. In security-patch, this stage
  also serves as requirements capture. Do not create design or implementation.
---

# amadeus-construction-nfr-requirements

## Purpose

Advance only Construction Stage 3.2 NFR Requirements for the target Unit.

This is an internal skill called from the `amadeus` entrypoint while a Bolt is
being executed.

Determine the target Unit's non-functional requirements (performance,
security, scalability, reliability) and technology stack decisions.
In security-patch, Requirements Analysis is not executed, so this stage also
serves as requirements capture, and `security-requirements.md` becomes the
source of the requirements.

## Prerequisites

Assume the target record's `aidlc-state.md` has `nfr-requirements` as an
executable Stage Progress item, and the CONSTRUCTION PHASE `Per unit:
<unit-id>` block has the `nfr-requirements` checkbox in one of these states:
`[ ]`, `[-]`, `[?]`, or `[R]`.

If the checkbox is `[?]`, resume from gate presentation without recreating the
artifacts.

If the checkbox is `[R]`, present the previous artifacts and the requested
changes, then make only the necessary corrections.

In both cases, do not restart the whole procedure.

The Condition is: the Unit needs performance requirements, security
considerations, scalability, or a technology stack decision.

When there are no NFR requirements and the technology stack is already
decided, create no artifacts. Set the target Unit checkbox to `[S]`, write the
skip reason in the note, append a `STAGE_SKIPPED` event to `audit/audit.md`,
and return to `amadeus`.

Read at least the following inputs:

- `construction/<unit-id>-<slug>/functional-design/business-logic-model.md`
  and `business-rules.md` (when Functional Design was executed)
- `inception/requirements-analysis/requirements.md` (when Requirements
  Analysis was executed)
- `aidlc/spaces/<space>/codekb/<repo>/technology-stack.md` (for brownfield)
- `aidlc-state.md`

If Functional Design was not executed, follow the fallback input rule: use
`inception/requirements-analysis/requirements.md` and the artifacts under
`aidlc/spaces/<space>/codekb/<repo>/` as inputs, and record the fallback
inputs used in `performance-requirements.md`.

## Questions

Treat questions during Construction as exceptional.

Ask only when you detect a real gap that earlier artifacts did not cover. Use
the `amadeus-grilling` protocol and ask one question at a time.

If you ask questions, record them in
`construction/<unit-id>-<slug>/nfr-requirements/nfr-requirements-questions.md`.

## Templates

Use templates in this priority order:

1. `aidlc/spaces/<space>/memory/templates/intents/construction/nfr-requirements/`
2. `templates/construction/nfr-requirements/` bundled with this skill.

Do not leave unknown items blank. Write `未確認`.

## Artifacts

Create or update only the following files:

- `construction/<unit-id>-<slug>/nfr-requirements/performance-requirements.md`
- `construction/<unit-id>-<slug>/nfr-requirements/security-requirements.md`
- `construction/<unit-id>-<slug>/nfr-requirements/scalability-requirements.md`
- `construction/<unit-id>-<slug>/nfr-requirements/reliability-requirements.md`
- `construction/<unit-id>-<slug>/nfr-requirements/tech-stack-decisions.md`
- `construction/<unit-id>-<slug>/nfr-requirements/memory.md`
- `aidlc-state.md` for the target Unit checkbox and `audit/audit.md` for gate
  events
- `construction/<unit-id>-<slug>/nfr-requirements/nfr-requirements-questions.md`,
  only if questions were asked

## Procedure

The following procedure applies when starting from checkbox `[ ]`.

When resuming from `[?]` or `[R]`, follow the prerequisite resume rules and run
only the steps needed for gate presentation or correction.

1. Only when the checkbox is `[ ]`, evaluate the Condition. If it is false, set
   the target Unit to `[S]`, write the skip reason in the note, append
   `STAGE_SKIPPED` to `audit/audit.md`, and stop. Do not reevaluate when
   resuming from `[-]`, `[?]`, or `[R]`.
2. Set the target Unit's `nfr-requirements` checkbox to `[-]`.
3. Read the inputs, and ask only for real gaps. If Functional Design was not
   executed, follow the prerequisite's fallback input rule and record the
   fallback inputs used in `performance-requirements.md`.
4. Create the artifacts.
5. Record interpretations, deviations, tradeoffs, and unresolved questions in
   `construction/<unit-id>-<slug>/nfr-requirements/memory.md`.
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

If `aidlc-state.md` has `Construction Autonomy Mode: autonomous` and the target
Bolt is not a walking skeleton, do not present the gate. Continue to the next
stage.

In that case, approval evidence is recorded after the Bolt PR is merged: the
`amadeus` entrypoint's Bolt boundary processing records `STAGE_COMPLETED` with
the PR URL in Details.

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

AI-DLC v2 assigns this stage `reviewer: aidlc-architecture-reviewer-agent`
with `reviewer_max_iterations: 2`. Amadeus DLC intentionally runs no
reviewer sub-agent: independent review maps to this gate's human approval
(or the Bolt PR review in autonomous mode), the Request Changes revision
loop bounds the review iterations, and `amadeus-validator` covers
structural validation. See `docs/amadeus/aidlc-v2-reviewer-mapping.md`.

AI-DLC v2 declares the `required-sections`, `upstream-coverage`, `linter`,
and `type-check` sensors for this stage. Amadeus DLC runs no sensor
mechanism: the markdown sensors map to `amadeus-validator` structural
validation and the phase's `traceability.md`, and the code sensors map to
Build and Test (Stage 3.6) records and the Bolt PR's CI. See
`docs/amadeus/aidlc-v2-sensor-learn-mapping.md`.

## Prohibitions

- Do not finalize the NFR design (realization approach). Design is the
  responsibility of NFR Design.
- Do not create implementation or test code.
- Do not record `completed` before approval.

## Next Skill

- Continue the Bolt: `amadeus`, which resolves the next stage inside the Bolt.
- Validate artifact structure: `amadeus-validator`.
