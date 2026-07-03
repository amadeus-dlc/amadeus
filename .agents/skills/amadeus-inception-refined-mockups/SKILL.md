---
name: amadeus-inception-refined-mockups
description: >-
  Internal Amadeus Inception skill. Use only for Stage 2.5 Refined Mockups.
  Use when the Intent has UI and Ideation produced rough mockups, and must
  create or repair mockups.md, interaction-spec.md, design-system-mapping.md,
  and accessibility-checklist.md. For an API, refine the interaction diagram.
  Do not create requirements, design, Units, Bolts, or implementation.
---

# amadeus-inception-refined-mockups

## Purpose

Advance only Inception Stage 2.5 Refined Mockups.

This is an internal skill called from the `amadeus` entrypoint.

Refine the rough mockups into detailed mockups mapped to the requirements and
stories.

## Prerequisites

Assume the target record's `aidlc-state.md` has `refined-mockups` as an
executable Stage Progress item, with the checkbox in one of these states:
`[ ]`, `[-]`, `[?]`, or `[R]`.

If the checkbox is `[?]`, resume from gate presentation without recreating the
artifacts.

If the checkbox is `[R]`, present the previous artifacts and the requested
changes, then make only the necessary corrections.

In both cases, do not restart the whole procedure.

The Condition is: the Intent has UI and Ideation produced rough mockups. For
an API, refine the interaction diagram.

If rough mockups do not exist, create no artifacts. Set the checkbox to `[S]`,
write the skip reason in the note, append a `STAGE_SKIPPED` event to
`audit/audit.md`, and return to `amadeus`.

Read at least the following inputs:

- `ideation/rough-mockups/wireframes.md` and `user-flow.md`
- `inception/requirements-analysis/requirements.md`
- `inception/user-stories/stories.md`, if it was executed
- `inception/practices-discovery/team-practices.md`, if it was executed
- `aidlc-state.md`

## Questions

Confirm the following points:

- Which interactions must be finalized during refinement?
- Are there design system or UI conventions to use?
- What accessibility standards must be met?

Ask questions one at a time following the `amadeus-grilling` protocol, attach
a recommended answer, and wait for the response.
Use `aidlc-state.md`'s `Depth` as a guide for how many questions to ask.
Record the questions and answers in
`inception/refined-mockups/refined-mockups-questions.md`.

## Templates

Use templates in this priority order:

1. `aidlc/spaces/<space>/memory/templates/intents/inception/refined-mockups/`
2. `templates/inception/refined-mockups/` bundled with this skill.

Write diagrams in PlantUML or Mermaid that can be embedded in Markdown.
Do not leave unknown items blank. Write `未確認`.

## Artifacts

Create or update only the following files:

- `inception/refined-mockups/mockups.md`
- `inception/refined-mockups/interaction-spec.md`
- `inception/refined-mockups/design-system-mapping.md`
- `inception/refined-mockups/accessibility-checklist.md`
- `inception/refined-mockups/refined-mockups-questions.md`
- `inception/refined-mockups/memory.md` (learning record of the stage
  execution)
- `aidlc-state.md` for the target stage checkbox and `audit/audit.md` for gate
  events

## Procedure

The following procedure applies when starting from checkbox `[ ]`.

When resuming from `[?]` or `[R]`, follow the prerequisite resume rules and
run only the steps needed for gate presentation or correction.

1. Only when the checkbox is `[ ]`, evaluate the Condition. If it is false,
   set the checkbox to `[S]`, write the skip reason in the note, append
   `STAGE_SKIPPED` to `audit/audit.md`, and stop. Do not reevaluate when
   resuming from `[-]`, `[?]`, or `[R]`.
2. Set the `refined-mockups` checkbox in `aidlc-state.md` to `[-]`.
3. Read the rough mockups, requirements, and stories, and confirm any gaps
   with questions.
4. Create the four artifacts. Each mockup references the identifiers of the
   corresponding requirements and stories.
5. Record interpretations, deviations, tradeoffs, and unresolved questions
   made during execution in the stage's `memory.md`.
6. Set the `refined-mockups` checkbox to `[?]`, append a
   `STAGE_AWAITING_APPROVAL` event to `audit/audit.md`, and present the gate.

## Gate

Show an artifact summary and the paths to review, then ask for approval with
exactly two options: Approve or Request Changes.

For Inception stages, additional execution of a skipped stage can be a third
option.
If additional execution of a skipped stage is selected, revert the target
stage's checkbox from `[S]` to `[ ]`, revert the skip note to `EXECUTE`, and
return to the `amadeus` entrypoint. The entrypoint selects the target stage on
the next resolution.
If Request Changes happens three times in a row, add Accept as-is as an
option.
When presenting a gate, wait for the human response in that turn.

When approved, set the checkbox to `[x]`, append `GATE_APPROVED` with the
human response recorded as-is, and append `STAGE_COMPLETED` to
`audit/audit.md`.
When changes are requested, set the checkbox to `[R]`, append `GATE_REJECTED`
with the requested changes recorded as-is, and append `STAGE_REVISING`.
If Accept as-is is selected, set the checkbox to `[x]`, append `GATE_APPROVED`
noting Accept as-is, append `STAGE_COMPLETED`, and record this decision in
`inception/decisions.md`.

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

- Do not run without rough mockups.
- Do not create implementation (HTML, CSS, component code).
- Do not create requirements, Units, or Bolts.
- Do not record `completed` without waiting for approval.

## Next Skill

- To continue: `amadeus` (the entrypoint resolves the next stage).
- Validate artifact structure: `amadeus-validator`.
