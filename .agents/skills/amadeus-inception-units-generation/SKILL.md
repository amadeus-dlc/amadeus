---
name: amadeus-inception-units-generation
description: >-
  Internal Amadeus Inception skill. Use only for Stage 2.7 Units Generation.
  Generate Units and the dependency DAG from Application Design and the
  requirements, and use it whenever creating or repairing unit-of-work.md,
  unit-of-work-dependency.md, and unit-of-work-story-map.md. Create only the
  topology (Unit boundaries and dependencies); leave implementation ordering
  and economic sequencing to Delivery Planning. Do not create Bolts or
  implementation.
---

# amadeus-inception-units-generation

## Purpose

Advance only Inception Stage 2.7 Units Generation.

This is an internal skill called from the `amadeus` entrypoint.

Generate Units and the dependency DAG from Application Design and the
requirements.

This stage creates only the topology (Unit boundaries and dependencies).
Do not handle implementation ordering, critical path recommendations, or economic sequencing (what to ship first).
Those are the responsibility of Stage 2.8 Delivery Planning.

## Prerequisites

Assume the target record's `aidlc-state.md` has `units-generation` as an
executable Stage Progress item, with the checkbox in one of these states:
`[ ]`, `[-]`, `[?]`, or `[R]`.

If the checkbox is `[?]`, resume from gate presentation without recreating
the artifacts.

If the checkbox is `[R]`, present the previous artifacts and the requested
changes, then make only the necessary corrections.

In both cases, do not restart the whole procedure.

Read at least the following inputs:

- `inception/requirements-analysis/requirements.md`
- `inception/application-design/`, if it was executed (components,
  component-methods, services, component-dependency, decisions).
- `inception/user-stories/stories.md`, if it was executed.
- `ideation/scope-definition/intent-backlog.md`, if it exists. Evaluate its
  items as Unit candidates.
- `aidlc-state.md`

If Application Design was not executed, follow the fallback input rule and
determine Unit boundaries from
`aidlc/spaces/<space>/codekb/<repo>/architecture.md` and
`aidlc/spaces/<space>/codekb/<repo>/component-inventory.md`, or from
`inception/requirements-analysis/requirements.md`.
If a fallback was used, record the fallback used in `unit-of-work.md`.

## Questions

Confirm the following points with the human.

- Which Unit boundary strategy to use (by service, by feature, by domain, or
  by deployment target).
- Which granularity to lean toward (coarse or fine).

Follow the `amadeus-grilling` protocol: ask one question at a time, attach a
recommended answer, and wait for the response.

If you ask questions, record them in
`inception/units-generation/units-generation-questions.md`.

Also record the finalized decisions on boundary strategy and granularity in
`inception/grillings.md` and `inception/grillings/Gxxx-<topic>.md`.

## Templates

Use templates in this priority order:

1. `aidlc/spaces/<space>/memory/templates/intents/inception/units-generation/`
2. `templates/inception/units-generation/` bundled with this skill.

Do not leave unknown items blank. Write `未確認`.

## Artifacts

Create or update only the following files:

- `inception/units-generation/unit-of-work.md` (Unit list: identifiers from
  `U001` onward, responsibilities, and corresponding requirements)
- `inception/units-generation/unit-of-work-dependency.md` (Unit dependency
  DAG)
- `inception/units-generation/unit-of-work-story-map.md` (Unit-to-story
  mapping, only when stories exist)
- `inception/units-generation/memory.md` (learning record from stage
  execution)
- `aidlc-state.md` for the target stage checkbox, and `audit/audit.md` for
  gate event entries
- `inception/units-generation/units-generation-questions.md`, only if
  questions were asked

When there are many Units, you may split them into
`units/<unit-id>-<slug>.md`. Even then, keep `unit-of-work.md` as the summary
list.

## Procedure

The following procedure applies when starting from checkbox `[ ]`.

When resuming from `[?]` or `[R]`, follow the prerequisite resume rules and
run only the steps needed for gate re-presentation or correction.

1. Set the `units-generation` checkbox in `aidlc-state.md` to `[-]`.
2. Read the Application Design artifacts (if executed) and the requirements,
   and identify Unit candidates. If Application Design was not executed,
   follow the prerequisite's fallback input rule and determine Unit
   boundaries from `architecture.md` and `component-inventory.md` under
   `aidlc/spaces/<space>/codekb/<repo>/`, or from
   `inception/requirements-analysis/requirements.md`, and record the fallback
   used in `unit-of-work.md`. Also evaluate scope backlog items as Unit
   candidates.
3. Confirm the boundary strategy and granularity with the human.
4. Create `unit-of-work.md` and `unit-of-work-dependency.md`. Make the
   dependencies acyclic. If stories exist, also create
   `unit-of-work-story-map.md`.
5. Record interpretations, deviations, tradeoffs, and unresolved questions
   made during execution in the stage's `memory.md`.
6. Set the `units-generation` checkbox in `aidlc-state.md` to `[?]`, append a
   `STAGE_AWAITING_APPROVAL` event to `audit/audit.md`, and present the gate.

## Gate

Show an artifact summary and the paths to review, then ask for approval with
exactly two options: Approve or Request Changes.

For Inception stages, you may add executing a skipped stage as a third
option.

If executing a skipped stage is selected, revert the target stage's checkbox
from `[S]` to `[ ]`, revert the skip note to `EXECUTE`, and return to the
`amadeus` entrypoint. The entrypoint selects the target stage on its next
resolution.

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
`GATE_APPROVED` (noting Accept as-is) and `STAGE_COMPLETED`, and record the
decision in `inception/decisions.md`.

AI-DLC v2 assigns this stage `reviewer: aidlc-architecture-reviewer-agent`
with `reviewer_max_iterations: 2`. Amadeus DLC intentionally runs no
reviewer sub-agent: independent review maps to this gate's human approval
and the phase PR review, the Request Changes revision loop bounds the
review iterations, and `amadeus-validator` covers structural validation.
See `docs/amadeus/aidlc-v2-reviewer-mapping.md`.

AI-DLC v2 declares the `required-sections` and `upstream-coverage` sensors
for this stage. Amadeus DLC runs no sensor mechanism: `required-sections`
maps to `amadeus-validator` structural validation, and `upstream-coverage`
maps to this stage's required inputs and the phase's `traceability.md`. See
`docs/amadeus/aidlc-v2-sensor-learn-mapping.md`.

## Prohibitions

- Do not write implementation ordering, critical path, or economic
  sequencing. Those are the responsibility of Delivery Planning.
- Do not create Bolts or Unit Design Briefs.
- Do not split Units based solely on technical layers (DB, API, frontend).
- Do not record `completed` without waiting for approval.

## Next Skill

- Continue: `amadeus`, which resolves the next stage.
- Validate artifact structure: `amadeus-validator`.
