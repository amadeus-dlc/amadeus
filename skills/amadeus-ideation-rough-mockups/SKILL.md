---
name: amadeus-ideation-rough-mockups
description: >-
  Internal Amadeus Ideation skill. Use only for Stage 1.6 Rough Mockups. Use
  when the target Intent has a UI, or when you want to confirm API or
  backend system interactions, and must create or repair wireframes.md and
  user-flow.md. Do not create high-fidelity UI, detailed mockups,
  requirements, or implementation.
---

# amadeus-ideation-rough-mockups

## Purpose

Advance only Ideation Stage 1.6 Rough Mockups.

This is an internal skill called from the `amadeus` entrypoint.

Create wireframes and a user flow at a granularity that later requirements
and stories can check as concrete examples. For an Intent with no UI, create
a system interaction diagram.

## Prerequisites

Assume the target record's `aidlc-state.md` has `rough-mockups` as an
executable Stage Progress item, and the checkbox is one of `[ ]`, `[-]`,
`[?]`, or `[R]`.

If the checkbox is `[?]`, resume from gate presentation without recreating
the artifacts.

If the checkbox is `[R]`, present the previous artifacts and the rejection
reason, then make only the corrections.

In both cases, do not restart the whole procedure.

The Condition is: the target includes a UI. For API or backend, a system
interaction diagram substitutes for it.

If there is neither a UI nor a system interaction, create no artifacts. Set
the checkbox to `[S]`, write the skip reason in the note, append a
`STAGE_SKIPPED` event to `audit/audit.md`, and return to `amadeus`.

Read at least the following:

- `aidlc/spaces/<space>/intents/<dirName>.md`
- `aidlc-state.md`
- `ideation/scope-definition/scope-document.md` and `intent-backlog.md`

## Questions

Confirm the following points.

- Which screen or interaction does the user want to check first?
- Where are the start and end points of the main flow?

Follow the `amadeus-grilling` protocol for questions: present them one at a
time with a recommended answer, and wait for the response. Use
`aidlc-state.md`'s `Depth` as a guide for the number of questions.

Record the questions and answers in
`ideation/rough-mockups/rough-mockups-questions.md`.

## Templates

Use templates in this priority order:

1. `aidlc/spaces/<space>/memory/templates/intents/ideation/rough-mockups/`
2. `templates/ideation/rough-mockups/` bundled with this skill.

Write diagrams in PlantUML or Mermaid that can be embedded in Markdown.

Do not leave unknown items blank. Write `未確認`.

## Artifacts

Create or update only the following files:

- `ideation/rough-mockups/wireframes.md` (a system interaction diagram when
  there is no UI)
- `ideation/rough-mockups/user-flow.md`
- `ideation/rough-mockups/rough-mockups-questions.md`
- `ideation/rough-mockups/memory.md` (learning record of the stage
  execution)
- `aidlc-state.md` (the target stage's checkbox) and `audit/audit.md` (gate
  event entries)

## Procedure

The following procedure applies when starting from checkbox `[ ]`.

When resuming from `[?]` or `[R]`, follow the prerequisite resume rules and
run only the steps needed for gate re-presentation or correction.

1. Only when the checkbox is `[ ]`, evaluate the Condition. If it is false,
   set the checkbox to `[S]`, write the skip reason in the note, append
   `STAGE_SKIPPED` to `audit/audit.md`, and stop. Do not reevaluate when
   resuming from `[-]`, `[?]`, or `[R]`.
2. Set `aidlc-state.md`'s `rough-mockups` checkbox to `[-]`.
3. Read scope-document and intent-backlog, and identify the flows to check.
4. Confirm gaps with questions.
5. Create `wireframes.md` and `user-flow.md`.
6. Record interpretations, deviations, tradeoffs, and unresolved questions
   made during execution in the stage's `memory.md`.
7. Set `aidlc-state.md`'s `rough-mockups` checkbox to `[?]`, append a
   `STAGE_AWAITING_APPROVAL` event to `audit/audit.md`, and present the
   gate.

## Gate

Show an artifact summary and the paths to review, then ask for approval
with exactly two options: Approve or Request Changes.

In Ideation stages, additional execution of a skipped stage can be a third
option. If additional execution of a skipped stage is selected, revert the
target stage's checkbox from `[S]` to `[ ]`, revert the skip note to
`EXECUTE`, and return to the `amadeus` entrypoint. The entrypoint selects
the target stage in the next resolution.

If Request Changes happens three times in a row, add Accept as-is as an
option.

When presenting a gate, wait for the human response in that turn.

When approved, set the checkbox to `[x]`, append `GATE_APPROVED` with the
human response recorded as-is, and append `STAGE_COMPLETED` to
`audit/audit.md`.

When changes are requested, set the checkbox to `[R]`, append
`GATE_REJECTED` with the requested changes recorded as-is, and append
`STAGE_REVISING`.

If Accept as-is is selected, set the checkbox to `[x]`, append
`GATE_APPROVED` noting Accept as-is, append `STAGE_COMPLETED`, and record
the decision in `ideation/decisions.md`.

## Prohibitions

- Do not create high-fidelity UI or design system support. Detailing is
  handled by Inception's Refined Mockups.
- Do not create requirements, Units, Bolts, or implementation.
- Do not record `completed` without waiting for approval.

## Next Skill

- Continue: `amadeus` (the entrypoint resolves the next stage).
- Validate artifact structure: `amadeus-validator`.
