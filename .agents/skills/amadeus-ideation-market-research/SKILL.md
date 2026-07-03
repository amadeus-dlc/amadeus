---
name: amadeus-ideation-market-research
description: >-
  Internal Amadeus Ideation skill. Use only for Stage 1.2 Market Research. Use
  when the target Intent has an external market position or a build-vs-buy
  decision, and must create or repair competitive-analysis.md,
  market-trends.md, and build-vs-buy.md. Do not run for internal tools, bug
  fixes, or refactoring. Do not create scope-document, requirements, or
  implementation.
---

# amadeus-ideation-market-research

## Purpose

Advance only Ideation Stage 1.2 Market Research.

This is an internal skill called from the `amadeus` entrypoint.

Organize the competitive landscape, market trends, and build-vs-buy decision
inputs.

## Prerequisites

Assume the target record's `aidlc-state.md` has `market-research` as an
executable Stage Progress item, and the checkbox is in one of these states:
`[ ]`, `[-]`, `[?]`, or `[R]`.

If the checkbox is `[?]`, resume from gate presentation without recreating the
artifacts. If the checkbox is `[R]`, present the previous artifacts and the
requested changes, then make only the necessary corrections. In both cases, do
not restart the whole procedure.

The Condition is: there is an external market position or a build-vs-buy
decision. If the Condition is false, create no artifacts. Set the checkbox to
`[S]`, write the skip reason in the note, append a `STAGE_SKIPPED` event to
`audit/audit.md`, and return to `amadeus`.

Read at least the following inputs:

- `aidlc/spaces/<space>/intents/<dirName>.md`
- `aidlc-state.md`
- The Space's `memory/` and `knowledge/`.

## Questions

Confirm the following points:

- What competitors or alternatives serve as comparison targets?
- What market or user trends affect the decision?
- What conditions are needed for the build-vs-buy decision?

Follow the `amadeus-grilling` protocol: ask one question at a time, attach a
recommended answer, and wait for the response. Use `aidlc-state.md`'s `Depth`
as a guide for the number of questions. Record questions and answers in
`ideation/market-research/market-research-questions.md`.

## Templates

Use templates in this priority order:

1. `aidlc/spaces/<space>/memory/templates/intents/ideation/market-research/`
2. `templates/ideation/market-research/` bundled with this skill.

Do not leave unknown items blank. Write `未確認`.

## Artifacts

Create or update only the following files:

- `ideation/market-research/competitive-analysis.md`
- `ideation/market-research/market-trends.md`
- `ideation/market-research/build-vs-buy.md`
- `ideation/market-research/market-research-questions.md`
- `ideation/market-research/memory.md` (learning record of the stage
  execution)
- `aidlc-state.md` for the target stage's checkbox, and `audit/audit.md` for
  gate event entries

## Procedure

The following procedure applies when starting from checkbox `[ ]`. When
resuming from `[?]` or `[R]`, follow the prerequisite resume rules and run only
the steps needed for gate re-presentation or correction.

1. Only when the checkbox is `[ ]`, evaluate the Condition. If it is false,
   set the checkbox to `[S]`, write the skip reason in the note, append
   `STAGE_SKIPPED` to `audit/audit.md`, and stop. Do not reevaluate when
   resuming from `[-]`, `[?]`, or `[R]`.
2. Set the `market-research` checkbox in `aidlc-state.md` to `[-]`.
3. Read the Intent's module files and the Space's `memory/` and `knowledge/`,
   and confirm missing points with questions.
4. Create the three artifacts.
5. Record interpretations, deviations, tradeoffs, and unresolved questions
   made during execution in the stage's `memory.md`.
6. Set the `market-research` checkbox in `aidlc-state.md` to `[?]`, append a
   `STAGE_AWAITING_APPROVAL` event to `audit/audit.md`, and present the gate.

## Gate

Show an artifact summary and the paths to review, then ask for approval with
exactly two options: Approve or Request Changes.

In the Ideation stage, additional execution of a skipped stage can be a third
option. If additional execution of a skipped stage is selected, revert the
target stage's checkbox from `[S]` to `[ ]`, revert the skip note to
`EXECUTE`, and return to the `amadeus` entrypoint. The entrypoint selects the
target stage in the next resolution.

If Request Changes happens three times in a row, add Accept as-is as an
option. When presenting a gate, wait for the human response in that turn.

When approved, set the checkbox to `[x]`, and append `GATE_APPROVED`
(recording the human response as-is) and `STAGE_COMPLETED` to
`audit/audit.md`. When changes are requested, set the checkbox to `[R]`, and
append `GATE_REJECTED` (recording the requested changes as-is) and
`STAGE_REVISING`. If Accept as-is is selected, set the checkbox to `[x]`,
append `GATE_APPROVED` (noting Accept as-is) and `STAGE_COMPLETED`, and record
this decision in `ideation/decisions.md`.

## Prohibitions

- Do not run for internal tools, bug fixes, or refactoring.
- Do not create `scope-document.md`, `intent-backlog.md`, requirements, or
  implementation.
- Do not record `completed` without waiting for approval.

## Next Skill

- Continue: `amadeus`, which resolves the next stage.
- Validate artifact structure: `amadeus-validator`.
