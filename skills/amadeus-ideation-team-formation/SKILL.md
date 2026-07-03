---
name: amadeus-ideation-team-formation
description: >-
  Internal Amadeus Ideation skill. Use only for Stage 1.5 Team Formation. Use
  when team composition, capacity, or mob planning is meaningful for the
  target Intent, and must create or repair team-assessment.md,
  skill-matrix.md, and mob-composition.md. Do not run for a solo developer
  or a small team. Do not create requirements, Unit, Bolt, or implementation.
---

# amadeus-ideation-team-formation

## Purpose

Advance only Ideation Stage 1.5 Team Formation.

This is an internal skill called from the `amadeus` entrypoint.

Evaluate team structure, skills, and mob composition against the scope and
backlog.

## Prerequisites

Assume the target record's `aidlc-state.md` has `team-formation` as an
executable Stage Progress item, and the checkbox is in one of these states:
`[ ]`, `[-]`, `[?]`, or `[R]`.

If the checkbox is `[?]`, resume from gate presentation without recreating
the artifacts.

If the checkbox is `[R]`, present the previous artifacts and the reason for
the requested changes, then make only the necessary corrections.

In both cases, do not restart the procedure from the beginning.

The Condition is: team composition, capacity, or mob planning is
meaningful.

For a solo developer or small team, create no artifacts, set the checkbox
to `[S]`, write the skip reason in the note, append a `STAGE_SKIPPED` event
to `audit/audit.md`, and return to `amadeus`.

Read at least the following:

- `aidlc/spaces/<space>/intents/<dirName>.md`
- `aidlc-state.md`
- `ideation/scope-definition/scope-document.md` and `intent-backlog.md`
- The Space's `memory/` and `knowledge/` (actor definitions)

## Questions

Confirm the following points:

- Who is involved in this scope?
- What skills are needed, and how well are they currently covered?
- How should mob or parallel units of work be organized?

Follow the `amadeus-grilling` protocol: ask one question at a time, attach
a recommended answer, and wait for the response.

Use `aidlc-state.md`'s `Depth` as a guide for the number of questions.

Record questions and answers in
`ideation/team-formation/team-formation-questions.md`.

## Templates

Use templates in this priority order:

1. `aidlc/spaces/<space>/memory/templates/intents/ideation/team-formation/`
2. `templates/ideation/team-formation/` bundled with this skill.

Do not leave unknown items blank. Write `未確認`.

## Artifacts

Create or update only the following files:

- `ideation/team-formation/team-assessment.md`
- `ideation/team-formation/skill-matrix.md`
- `ideation/team-formation/mob-composition.md`
- `ideation/team-formation/team-formation-questions.md`
- `ideation/team-formation/memory.md` (the learning record of the stage
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
2. Set `aidlc-state.md`'s `team-formation` checkbox to `[-]`.
3. Read the scope-document, intent-backlog, and the Space's `memory/` and
   `knowledge/`, and confirm missing points with questions.
4. Create the three artifacts.
5. Record interpretations, deviations, tradeoffs, and unresolved questions
   made during execution in the stage's `memory.md`.
6. Set `aidlc-state.md`'s `team-formation` checkbox to `[?]`, append a
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

## Prohibitions

- Do not run for a solo developer or a small team.
- Do not finalize Bolt assignments. Assignment is handled by Inception's
  Delivery Planning.
- Do not create requirements, Unit, Bolt, or implementation.
- Do not record `completed` without waiting for approval.

## Next Skill

- Continue: `amadeus` (the entrypoint resolves the next stage).
- Validate artifact structure: `amadeus-validator`.
