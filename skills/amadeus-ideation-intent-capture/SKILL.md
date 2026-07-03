---
name: amadeus-ideation-intent-capture
description: >-
  Internal Amadeus Ideation skill. Use only for Stage 1.1 Intent Capture &
  Framing. Use when a Birthed Intent's purpose, target, success criteria, and
  trigger must be confirmed through clarifying questions, and
  intent-statement.md and stakeholder-map.md must be created or repaired. Do
  not create scope-document, intent-backlog, requirements, Unit, Bolt, or
  implementation.
---

# amadeus-ideation-intent-capture

## Purpose

Advance only Ideation Stage 1.1 Intent Capture & Framing.

This is an internal skill called from the `amadeus` entrypoint.

For the Intent skeleton created at Birth, confirm the problem to solve, the
target audience, the observable success criteria, and the trigger through
clarifying questions, create `intent-statement.md`, and build the stakeholder
map.

## Prerequisites

Assume the target record's `aidlc-state.md` has `intent-capture` as an
executable Stage Progress item, and the `intent-capture` checkbox is in one of
these states: `[ ]`, `[-]`, `[?]`, or `[R]`.

If the checkbox is `[?]`, resume from gate presentation without recreating the
artifacts.

If the checkbox is `[R]`, present the previous artifacts and the requested
changes, then make only the necessary corrections.

In both cases, do not restart the whole procedure.

Read at least the following inputs:

- `aidlc/spaces/<space>/intents/<dirName>.md`
- `aidlc-state.md`
- The Space's `memory/` and `knowledge/`

## Questions

Confirm the following points.

- What business problem or technical challenge does this solve?
- Who is the target audience, and what pain do they have?
- How can success be observed? For a technical Intent, what behavior must be
  preserved and what observable improvement metrics apply?
- Why start this work now (the trigger)?

Follow the `amadeus-grilling` protocol: ask one question at a time, attach a
recommended answer, and wait for the response.

Use `aidlc-state.md`'s `Depth` as a guide for the number of questions
(Minimal: 2-4 questions, Standard: 5-8 questions, Comprehensive: 8-12 or
more).

Detect ambiguity and contradictions in the answers, and ask additional
questions when needed.

Record the questions and answers in
`ideation/intent-capture/intent-capture-questions.md`.

Also record confirmed decisions that affect the meaning of artifacts or later
judgment in `ideation/grillings.md` and
`ideation/grillings/Gxxx-<topic>.md`.

## Templates

Use templates in this priority order:

1. `aidlc/spaces/<space>/memory/templates/intents/ideation/intent-capture/`
2. `templates/ideation/intent-capture/` bundled with this skill.

Replace the template's `<...>` placeholders with values known from the
answers and the Space's `memory/` and `knowledge/`.

Do not leave unknown items blank. Write `未確認`.

## Artifacts

Create or update only the following files:

- `ideation/intent-capture/intent-statement.md` (confirms the purpose,
  target, success criteria, trigger, and scope)
- `aidlc/spaces/<space>/intents/<dirName>.md` (confirms the goal profile)
- `ideation/intent-capture/stakeholder-map.md`
- `ideation/intent-capture/intent-capture-questions.md`
- `ideation/intent-capture/memory.md`
- `aidlc-state.md` for the `intent-capture` checkbox and `audit/audit.md` for
  gate event entries
- `aidlc/spaces/<space>/intents/intents.md` (regenerated via
  `bun run .agents/skills/amadeus-validator/scripts/IndexGenerate.ts
  <workspace>`; do not hand-edit)

Write the success criteria so they satisfy Intent acceptance condition ①
(observable success criteria).

## Procedure

The following procedure applies when starting from checkbox `[ ]`.

When resuming from `[?]` or `[R]`, follow the prerequisite resume rules and
run only the steps needed for gate presentation or correction.

1. Set the `intent-capture` checkbox in `aidlc-state.md` to `[-]`.
2. Read the module file's skeleton and the Space's `memory/` and
   `knowledge/`, and identify the missing points.
3. Present questions one at a time, and record the answers in
   `intent-capture-questions.md`.
4. Confirm the purpose, target, success criteria, trigger, and scope in
   `intent-statement.md`, and confirm the goal profile in the module file.
5. Create `stakeholder-map.md`. Write the stakeholders, the distinction
   between decision-makers and influencers, and the confirmation contacts
   needed.
6. Regenerate `aidlc/spaces/<space>/intents/intents.md` with
   `IndexGenerate.ts`.
7. Record interpretations, deviations, tradeoffs, and unresolved questions
   made during execution in the stage's `memory.md`.
8. Set the `intent-capture` checkbox in `aidlc-state.md` to `[?]`, append a
   `STAGE_AWAITING_APPROVAL` event to `audit/audit.md`, and present the gate.

## Gate

Show an artifact summary and the paths to review, then ask for approval with
the following two options:

- Approve: approve and proceed to the next stage.
- Request Changes: receive correction instructions and revise.

If Request Changes happens three times in a row at the same stage, add
Accept as-is (finalize as-is and proceed) as an option.

In the turn where the gate is presented, wait for the human's response, and
do not proceed without approval.

When approved, set the checkbox to `[x]`, and append `GATE_APPROVED`
(recording the human's response as-is) and `STAGE_COMPLETED` to
`audit/audit.md`.

When changes are requested, set the checkbox to `[R]`, and append
`GATE_REJECTED` (recording the requested changes as-is) and `STAGE_REVISING`.

If Accept as-is is selected, set the checkbox to `[x]`, append
`GATE_APPROVED` (noting that it is Accept as-is) and `STAGE_COMPLETED`, and
record this decision in `ideation/decisions.md`.

AI-DLC v2 declares the `required-sections` and `upstream-coverage` sensors
for this stage. Amadeus DLC runs no sensor mechanism: `required-sections`
maps to `amadeus-validator` structural validation, and `upstream-coverage`
maps to this stage's required inputs and the phase's `traceability.md`. See
`docs/amadeus/aidlc-v2-sensor-learn-mapping.md`.

## Prohibitions

- Do not perform Birth (the decision to create a new Intent) in this skill.
  Birth is the responsibility of the `amadeus` entrypoint.
- Do not create `scope-document.md`, `intent-backlog.md`, `requirements.md`,
  Unit, Bolt, or implementation.
- Do not record `completed` without waiting for approval.
- Do not hand-edit `aidlc/spaces/<space>/intents/intents.md`.

## Next Skill

- To continue: `amadeus` (the entrypoint resolves the next stage)
- Validate artifact structure: `amadeus-validator`
