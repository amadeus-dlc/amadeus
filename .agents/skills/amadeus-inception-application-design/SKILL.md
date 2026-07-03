---
name: amadeus-inception-application-design
description: >-
  Internal Amadeus Inception skill. Use only for Stage 2.6 Application Design.
  Use when an Intent needs design for new components or services, or for the
  service layer, and must create or repair components.md,
  component-methods.md, services.md, component-dependency.md, and
  decisions.md. Do not run for a change that only modifies existing
  components. Do not create Units, Bolts, or implementation.
---

# amadeus-inception-application-design

## Purpose

Advance only Inception Stage 2.6 Application Design.

This is an internal skill called from the `amadeus` entrypoint.

Design components, method boundaries, services, and dependencies from the
requirements and stories. This design becomes an input to Units Generation's
Unit boundaries.

## Prerequisites

Assume the target record's `aidlc-state.md` has `application-design` as an
executable Stage Progress item, with the checkbox in one of these states:
`[ ]`, `[-]`, `[?]`, or `[R]`.

If the checkbox is `[?]`, resume from gate presentation without recreating the
artifacts.

If the checkbox is `[R]`, present the previous artifacts and the requested
changes, then make only the necessary corrections.

In both cases, do not restart the whole procedure.

The Condition is: a new component or service is needed, or the service layer
needs design.

For a change that only modifies existing components, create no artifacts. Set
the checkbox to `[S]`, write the skip reason in the note, append a
`STAGE_SKIPPED` event to `audit/audit.md`, and return to `amadeus`.

Read at least the following inputs:

- `inception/requirements-analysis/requirements.md`
- `inception/user-stories/stories.md`, if executed
- `aidlc/spaces/<space>/codekb/<repo>/architecture.md` and
  `component-inventory.md`, for brownfield
- `inception/practices-discovery/team-practices.md`, if executed
- `aidlc/spaces/<space>/knowledge/domain-map.md` and Event Storming artifacts,
  if they exist. Use them as decision inputs for boundaries.
- `aidlc-state.md`

## Questions

Confirm the following points:

- Where are the new component's responsibility boundaries?
- What must not be compromised for consistency with the existing
  architecture?
- How should services be divided?

Follow the `amadeus-grilling` protocol: present questions one at a time with a
recommended answer, and wait for the response. Use `aidlc-state.md`'s `Depth`
as a guide for how many questions to ask. If you ask questions, record them in
`inception/application-design/application-design-questions.md`. Record design
decisions in `inception/grillings.md` and
`inception/grillings/Gxxx-<topic>.md` as well.

## Templates

Use templates in this priority order:

1. `aidlc/spaces/<space>/memory/templates/intents/inception/application-design/`
2. `templates/inception/application-design/` bundled with this skill.

Do not leave unknown items blank. Write `未確認`.

## Artifacts

Create or update only the following files:

- `inception/application-design/components.md` (component list and
  responsibilities)
- `inception/application-design/component-methods.md` (method boundaries)
- `inception/application-design/services.md` (service design)
- `inception/application-design/component-dependency.md` (dependencies)
- `inception/application-design/decisions.md` (this stage's design decisions)
- `inception/application-design/memory.md` (stage execution learning record)
- `aidlc-state.md` (the target stage checkbox) and `audit/audit.md` (gate
  event entries)
- `inception/application-design/application-design-questions.md`, only if
  questions were asked

`inception/application-design/decisions.md` handles this stage's design
decisions, separate from the phase's `inception/decisions.md`.

## Procedure

The following procedure applies when starting from checkbox `[ ]`.

When resuming from `[?]` or `[R]`, follow the prerequisite resume rules and run
only the steps needed for gate presentation or correction.

1. Only when the checkbox is `[ ]`, evaluate the Condition. If it is false, set
   the checkbox to `[S]`, write the skip reason in the note, append
   `STAGE_SKIPPED` to `audit/audit.md`, and stop. Do not reevaluate when
   resuming from `[-]`, `[?]`, or `[R]`.
2. Set the `application-design` checkbox in `aidlc-state.md` to `[-]`.
3. Read the requirements, stories, existing architecture, and domain decision
   inputs, and confirm missing points with questions.
4. Create the five artifacts. Each component must reference the identifier of
   its corresponding requirement.
5. Record the interpretations, deviations, tradeoffs, and unresolved questions
   from this run in the stage's `memory.md`.
6. Set the `application-design` checkbox in `aidlc-state.md` to `[?]`, append
   the `STAGE_AWAITING_APPROVAL` event to `audit/audit.md`, and present the
   gate.

## Gate

Show an artifact summary and the paths to review, then ask for approval with
exactly two options: Approve or Request Changes.

For Inception stages, executing an additional skipped stage can be offered as
a third option.

If executing an additional skipped stage is selected, set the target stage's
checkbox in `aidlc-state.md` from `[S]` back to `[ ]`, revert the skip note to
`EXECUTE`, and return to the `amadeus` entrypoint. The entrypoint selects the
target stage on its next resolution.

If Request Changes happens three times in a row, add Accept as-is as an
option.

When presenting a gate, wait for the human response in that turn.

When approved, set the checkbox to `[x]`, and append `GATE_APPROVED`
(recording the human response as-is) and `STAGE_COMPLETED` to
`audit/audit.md`.

When changes are requested, set the checkbox to `[R]`, and append
`GATE_REJECTED` (recording the rejection reason as-is) and `STAGE_REVISING`.

If Accept as-is is selected, set the checkbox to `[x]`, append `GATE_APPROVED`
(recording that it is Accept as-is) and `STAGE_COMPLETED`, and record this
decision in `inception/decisions.md`.

AI-DLC v2 assigns this stage `reviewer: aidlc-architecture-reviewer-agent`
with `reviewer_max_iterations: 2`. Amadeus DLC intentionally runs no
reviewer sub-agent: independent review maps to this gate's human approval
and the phase PR review, the Request Changes revision loop bounds the
review iterations, and `amadeus-validator` covers structural validation.
See `docs/amadeus/aidlc-v2-reviewer-mapping.md`.

## Prohibitions

- Do not run for an Intent that only modifies existing components.
- Do not create Units or Bolts. Finalizing Unit boundaries is Units
  Generation's responsibility.
- Do not create implementation or test code.
- Do not record `completed` before approval.

## Next Skill

- To continue: `amadeus` (the entrypoint resolves the next stage).
- Validate artifact structure: `amadeus-validator`.
