---
name: amadeus-construction-functional-design
description: >-
  Internal Amadeus Construction skill. Use only for Stage 3.1 Functional Design,
  per Unit. Use when a Unit needs design for a new data model, complex business
  logic, or business rules, and must create or repair business-logic-model.md,
  business-rules.md, domain-entities.md, and frontend-components.md when needed.
  Do not run for simple changes without new business logic. Do not implement
  code, tests, or Bolt records.
---

# amadeus-construction-functional-design

## Purpose

Advance only Construction Stage 3.1 Functional Design for the target Unit.

This is an internal skill called from the `amadeus` entrypoint while a Bolt is
being executed.

Design the target Unit's business logic model, business rules, and domain
entities. When the Unit has UI, also design the frontend component structure.

Functional Design is the maintenance point for the detailed Domain Model and
Intent Contracts.

Generated Amadeus DLC artifacts and user-facing gate text must remain Japanese,
following the workspace language rules and
`docs/amadeus/skill-language-policy.md`.

## Prerequisites

Assume the target record's `aidlc-state.md` has `functional-design` as an
executable Stage Progress item, and the CONSTRUCTION PHASE `Per unit: <unit-id>`
block has the `functional-design` checkbox in one of these states: `[ ]`,
`[-]`, `[?]`, or `[R]`.

If the checkbox is `[?]`, resume from gate presentation without recreating the
artifacts.

If the checkbox is `[R]`, present the previous artifacts and the requested
changes, then make only the necessary corrections.

In both cases, do not restart the whole procedure.

The Condition is: the Unit needs design for a new data model, complex business
logic, or business rules.

For a simple change with no new business logic, create no artifacts. Set the
target Unit checkbox to `[S]`, write the skip reason in the note, append a
`STAGE_SKIPPED` event to `audit/audit.md`, and return to `amadeus`.

Read at least the following inputs:

- `inception/units-generation/unit-of-work.md` for the target Unit. If Units
  Generation was not executed, use the Intent module files and requirements as
  the implicit Unit.
- `inception/requirements-analysis/requirements.md`, if it exists.
- `inception/application-design/`, if it exists.
- `aidlc/spaces/<space>/knowledge/domain-map.md`,
  `aidlc/spaces/<space>/knowledge/context-map.md`, and Event Storming artifacts,
  if they exist. Use Aggregate Candidate and Bounded Context Candidate entries as
  decision inputs.
- `aidlc-state.md`.

If Application Design was not executed, follow the fallback input rule: use
`inception/requirements-analysis/requirements.md` and the artifacts under
`aidlc/spaces/<space>/codekb/<repo>/` as design inputs, and record the fallback
inputs used in `business-logic-model.md`.

## Questions

Treat questions during Construction as exceptional.

Ask only when you detect a real gap that earlier artifacts did not cover, such
as a Unit-specific edge case. Use the `amadeus-grilling` protocol and ask one
question at a time.

If you ask questions, record them in
`construction/<unit-id>-<slug>/functional-design/functional-design-questions.md`.

## Templates

Use templates in this priority order:

1. `aidlc/spaces/<space>/memory/templates/intents/construction/functional-design/`
2. `templates/construction/functional-design/` bundled with this skill.

If a template has supplemental headings outside the Catalog, preserve those
headings.

Do not leave unknown items blank. Write `未確認`.

## Artifacts

Create or update only the following files:

- `construction/<unit-id>-<slug>/functional-design/business-logic-model.md`
- `construction/<unit-id>-<slug>/functional-design/business-rules.md`, including
  Intent Contracts
- `construction/<unit-id>-<slug>/functional-design/domain-entities.md`
- `construction/<unit-id>-<slug>/functional-design/frontend-components.md`, only
  when the Unit has UI
- `construction/<unit-id>-<slug>/functional-design/memory.md`
- `aidlc-state.md` for the target Unit checkbox and `audit/audit.md` for gate
  events
- `construction/<unit-id>-<slug>/functional-design/functional-design-questions.md`,
  only if questions were asked

After Functional Design approval, record candidates to promote into the Domain
Map and Context Map under the `Domain Map と Context Map への反映候補` section in
`domain-entities.md`.

When the target Unit's Functional Design is approved, update the Domain Map only
for decisions adopted as shared boundaries. Update the Context Map only for
decisions adopted as inter-context dependencies. Use the current index states
`adopted` or `retired`.

Do not place candidates in the Domain Map or Context Map.

## Procedure

The following procedure applies when starting from checkbox `[ ]`.

When resuming from `[?]` or `[R]`, follow the prerequisite resume rules and run
only the steps needed for gate presentation or correction.

1. Only when the checkbox is `[ ]`, evaluate the Condition. If it is false, set
   the target Unit to `[S]`, write the skip reason in the note, append
   `STAGE_SKIPPED` to `audit/audit.md`, and stop. Do not reevaluate when
   resuming from `[-]`, `[?]`, or `[R]`.
2. Set the target Unit's `functional-design` checkbox to `[-]`.
3. Read the target Unit, requirements, Application Design, and domain decision
   inputs. Ask only for real gaps. If Application Design was not executed, follow
   the fallback input rule and record the fallback inputs used in
   `business-logic-model.md`.
4. Create `business-logic-model.md`, `business-rules.md`, and
   `domain-entities.md`. If the Unit has UI, also create
   `frontend-components.md`.
5. Record interpretations, deviations, tradeoffs, and unresolved questions in
   `construction/<unit-id>-<slug>/functional-design/memory.md`.
6. Set the target Unit checkbox to `[?]`, append `STAGE_AWAITING_APPROVAL` to
   `audit/audit.md`, and present the gate.

## Gate

Show an artifact summary and the paths to review, then ask for approval with
exactly two options: Approve or Request Changes.

Construction gates are limited to those two options. Do not offer additional
execution for skipped stages as a gate option.

If Request Changes happens three times in a row, add Accept as-is as an option.

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

After approval, reflect only the adopted decisions from
`domain-entities.md`'s `Domain Map と Context Map への反映候補` section into the
Domain Map and Context Map.

If the conversation gate was skipped because of autonomy mode, this skill does
not update those maps. In that case, the `amadeus` entrypoint's Bolt boundary
processing performs the reflection after the Bolt PR is merged.

AI-DLC v2 assigns this stage `reviewer: aidlc-architecture-reviewer-agent`
with `reviewer_max_iterations: 2`. Amadeus DLC intentionally runs no
reviewer sub-agent: independent review maps to this gate's human approval
(or the Bolt PR review in autonomous mode), the Request Changes revision
loop bounds the review iterations, and `amadeus-validator` covers
structural validation. See `docs/amadeus/aidlc-v2-reviewer-mapping.md`.

## Prohibitions

- Do not run for a simple change with no new business logic.
- Do not implement code, test code, or Bolt records under `bolts/**`.
- Do not put candidates in the Domain Map or Context Map. Reflect only approved
  adopted decisions.
- Do not set the checkbox to `[x]` before approval.

## Next Skill

- Continue the Bolt: `amadeus`, which resolves the next stage inside the Bolt.
- Actively refine the domain model: `amadeus-domain-modeling`.
- Validate artifact structure: `amadeus-validator`.
