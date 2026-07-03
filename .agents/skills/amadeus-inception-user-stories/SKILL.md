---
name: amadeus-inception-user-stories
description: >-
  Internal Amadeus Inception skill. Use only for Stage 2.4 User Stories. Use
  when the Intent has user-facing functionality, multiple personas, complex
  business logic, or cross-team work, and must create or repair stories.md,
  personas.md, and user-stories-assessment.md. Do not run for pure
  refactoring, a single bug fix, infrastructure-only changes, or developer
  tools. Do not create requirements, design, Units, Bolts, or implementation.
---

# amadeus-inception-user-stories

## Purpose

Advance only Inception Stage 2.4 User Stories.

This is an internal skill called from the `amadeus` entrypoint.

Translate requirements into value expressions for human actors, and organize
personas.

## Prerequisites

Assume the target record's `aidlc-state.md` has `user-stories` as an
executable Stage Progress item, and the checkbox is in one of these states:
`[ ]`, `[-]`, `[?]`, or `[R]`.

If the checkbox is `[?]`, resume from gate presentation without recreating the
artifacts.
If the checkbox is `[R]`, present the previous artifacts and the requested
changes, then make only the necessary corrections.
In both cases, do not restart the whole procedure.

The Condition is: the Intent has user-facing functionality, multiple personas,
complex business logic, or cross-team work.
For pure refactoring, a single bug fix, infrastructure-only changes, or
developer tools, create no artifacts. Set the checkbox to `[S]`, write the
skip reason in the note, append a `STAGE_SKIPPED` event to `audit/audit.md`,
and return to `amadeus`.

Read at least the following inputs:

- `inception/requirements-analysis/requirements.md`
- `aidlc-state.md`
- `aidlc/spaces/<space>/codekb/<repo>/business-overview.md` and
  `component-inventory.md` (for brownfield)
- `inception/practices-discovery/team-practices.md` (if executed)
- the Space's `memory/` (actor definitions)

## Templates

Use templates in this priority order:

1. `aidlc/spaces/<space>/memory/templates/intents/inception/user-stories/`
2. `templates/inception/user-stories/` bundled with this skill.

Do not leave unknown items blank. Write `未確認`.

## Artifacts

Create or update only the following files:

- `inception/user-stories/stories.md` (the story list; include identifiers
  from `S001` onward and references to requirements)
- `inception/user-stories/personas.md`
- `inception/user-stories/user-stories-assessment.md` (assessment of story
  coverage against requirements)
- `inception/user-stories/memory.md` (learning record of the stage execution)
- `aidlc-state.md` for the target stage checkbox and `audit/audit.md` for gate
  events
- `inception/user-stories/user-stories-questions.md`, only if questions were
  asked

## Procedure

The following procedure applies when starting from checkbox `[ ]`.
When resuming from `[?]` or `[R]`, follow the prerequisite resume rules and
run only the steps needed for gate presentation or correction.

1. Only when the checkbox is `[ ]`, evaluate the Condition. If it is false,
   set the checkbox to `[S]`, write the skip reason in the note, append
   `STAGE_SKIPPED` to `audit/audit.md`, and stop. Do not reevaluate when
   resuming from `[-]`, `[?]`, or `[R]`.
2. Set the `user-stories` checkbox in `aidlc-state.md` to `[-]`.
3. Read the requirements and actor definitions, and identify personas and
   stories. Use the `amadeus-grilling` protocol to confirm points needing
   judgment one question at a time.
4. Create `stories.md`, `personas.md`, and `user-stories-assessment.md`.
5. Record the interpretations, deviations, tradeoffs, and unresolved
   questions from the execution in the stage's `memory.md`.
6. Set the `user-stories` checkbox in `aidlc-state.md` to `[?]`, append the
   `STAGE_AWAITING_APPROVAL` event to `audit/audit.md`, and present the gate.

## Gate

Show an artifact summary and the paths to review, then ask for approval with
exactly two options: Approve or Request Changes.
In Inception stages, additional execution of an already-skipped stage can be
a third option.
If additional execution of a skipped stage is selected, revert the target
stage's checkbox from `[S]` to `[ ]`, revert the skip note to `EXECUTE`, and
return to the `amadeus` entrypoint. The entrypoint selects the target stage
at the next resolution.
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
`GATE_APPROVED` (including the note that it is Accept as-is) and
`STAGE_COMPLETED`, and record this decision in `inception/decisions.md`.

AI-DLC v2 assigns this stage `reviewer: aidlc-product-lead-agent` with
`reviewer_max_iterations: 2`. Amadeus DLC intentionally runs no reviewer
sub-agent: independent review maps to this gate's human approval and the
phase PR review, the Request Changes revision loop bounds the review
iterations, and `amadeus-validator` covers structural validation. See
`docs/amadeus/aidlc-v2-reviewer-mapping.md`.

## Prohibitions

- Do not run for pure refactoring, a single bug fix, or infrastructure-only
  changes.
- Do not create use-case artifacts (`use-cases.md`). Construction Functional
  Design handles the details of actor-system interactions.
- Do not create requirements, design, Units, Bolts, or implementation.
- Do not record `completed` before approval.

## Next Skill

- Continue the flow: `amadeus`, which resolves the next stage.
- Validate artifact structure: `amadeus-validator`.
