---
name: amadeus-inception-delivery-planning
description: >-
  Internal Amadeus Inception skill. Use only for Stage 2.8 Delivery Planning.
  Use when an Intent that has completed Units Generation needs economic
  sequencing applied to the Unit dependency DAG, and must create or repair
  bolt-plan.md, risk-and-sequencing-rationale.md, and
  external-dependency-map.md. This is the final Inception stage. Do not
  create implementation.
---

# amadeus-inception-delivery-planning

## Purpose

Advance only Inception Stage 2.8 Delivery Planning.

This is an internal skill called from the `amadeus` entrypoint.

Apply economic sequencing (what to ship first) to the Unit dependency DAG,
and create the Bolt plan.

## Prerequisites

Assume the target record's `aidlc-state.md` has `delivery-planning` as an
executable Stage Progress item, with the checkbox in one of these states:
`[ ]`, `[-]`, `[?]`, or `[R]`.

If the checkbox is `[?]`, resume from gate presentation without recreating
the artifacts.

If the checkbox is `[R]`, present the previous artifacts and the requested
changes, then make only the necessary corrections.

In both cases, do not restart the whole procedure.

Confirm that the `units-generation` checkbox in `aidlc-state.md` is `[x]`.
If it is not complete, stop and return to `amadeus`.

Read at least the following:

- `inception/units-generation/unit-of-work.md` and
  `unit-of-work-dependency.md`
- `inception/units-generation/unit-of-work-story-map.md`, if it exists
- `inception/requirements-analysis/requirements.md`
- `inception/application-design/components.md`, if executed
- `inception/user-stories/stories.md` and
  `inception/refined-mockups/mockups.md`, if executed
- `inception/practices-discovery/team-practices.md`, if executed
- `ideation/team-formation/team-assessment.md`, if executed
- `aidlc-state.md`

## Questions

Confirm the following points with the human.

- Which Bolt bundling approach to use (one Unit at a time, a bundle of
  related Units, or a thin slice across Units).
- What is the minimal slice to drive through in the first Bolt (walking
  skeleton).
- Which sequencing priority to use (risk-first, value-first, or
  dependency-first).

Follow the `amadeus-grilling` protocol: ask one question at a time, attach a
recommended answer, and wait for the response.
Record questions and answers in
`inception/delivery-planning/delivery-planning-questions.md`.
Also record the finalized bundling and sequencing decisions in
`inception/grillings.md` and `inception/grillings/Gxxx-<topic>.md`.

## Templates

Use templates in this priority order:

1. `aidlc/spaces/<space>/memory/templates/intents/inception/delivery-planning/`
2. `templates/inception/delivery-planning/` bundled with this skill.

Do not leave unknown items blank. Write `未確認`.
For items corresponding to a stage that was not executed (such as team
structure), do not write links to nonexistent files; write `該当なし`.

## Artifacts

Create or update only the following files:

- `inception/delivery-planning/bolt-plan.md` (the Bolt list: identifiers
  from `B001` onward, bundled Units, execution order, Definition of Done,
  and confidence hypothesis)
- `inception/delivery-planning/team-allocation.md` (assignment of owners to
  Bolts, only when a team exists)
- `inception/delivery-planning/risk-and-sequencing-rationale.md` (the
  sequencing rationale and risks)
- `inception/delivery-planning/external-dependency-map.md` (the mapping of
  external dependencies)
- `inception/delivery-planning/delivery-planning-questions.md`
- `inception/delivery-planning/memory.md` (the stage execution learning
  record)
- `aidlc-state.md` for the target stage checkbox and `audit/audit.md` for
  gate events

Make the first Bolt the minimal slice that drives through the architecture
(walking skeleton).
Attach a Definition of Done to each Bolt, and a confidence hypothesis of
what shipping that Bolt proves.
When there are many Bolts, splitting into `bolts/<bolt-id>-<slug>.md` is
allowed.

## Procedure

The following procedure applies when starting from checkbox `[ ]`.

When resuming from `[?]` or `[R]`, follow the prerequisite resume rules and
run only the steps needed for gate presentation or correction.

1. Confirm that the `units-generation` checkbox in `aidlc-state.md` is
   `[x]`. If it is not complete, stop and return to `amadeus`.
2. Set the `delivery-planning` checkbox in `aidlc-state.md` to `[-]`.
3. Read the Unit dependency DAG and requirements, and confirm the bundling
   approach, walking skeleton, and sequencing priority with the human.
4. Create `bolt-plan.md`. Make sure the order does not contradict the
   dependency DAG.
5. Create `risk-and-sequencing-rationale.md` and
   `external-dependency-map.md`. If a team exists, also create
   `team-allocation.md`.
6. Record interpretations, deviations, tradeoffs, and unresolved questions
   made during execution in the stage's `memory.md`.
7. Set the `delivery-planning` checkbox in `aidlc-state.md` to `[?]`, append
   a `STAGE_AWAITING_APPROVAL` event to `audit/audit.md`, and present the
   gate.
8. After approval, return to the `amadeus` entrypoint. Guiding the Inception
   phase PR, recording the `PHASE_VERIFIED` event, and transitioning Phase
   Progress and `Lifecycle Phase` are the responsibility of the `amadeus`
   entrypoint; this skill does not perform them.

## Gate

Show a summary of the bolt plan and the paths to review, then ask for
approval with exactly two options: Approve or Request Changes.

For Inception stages, additional execution of a skipped stage can be a
third option. If additional execution of a skipped stage is selected,
revert the target stage's checkbox from `[S]` to `[ ]`, revert the skip
note to `EXECUTE`, and return to the `amadeus` entrypoint. The entrypoint
selects the target stage on its next resolution.

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

## Prohibitions

- Do not run before Units Generation is complete.
- Do not create an order that contradicts the dependency DAG.
- Do not create task breakdowns or implementation.
- Do not record `PHASE_VERIFIED` or transition `Lifecycle Phase` in this
  skill. Phase boundary processing is the responsibility of the `amadeus`
  entrypoint.
- Do not record `completed` without waiting for approval.

## Next Skill

- Continue: `amadeus`, which resolves Inception's phase boundary processing
  and Construction's stages.
- Validate artifact structure: `amadeus-validator`
