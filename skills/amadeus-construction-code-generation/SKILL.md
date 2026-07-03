---
name: amadeus-construction-code-generation
description: >-
  Internal Amadeus Construction skill. Use only for Stage 3.5 Code Generation,
  per Unit. Use when, inside the Bolt's worktree, you must build an
  implementation plan from the target Unit's design artifacts as input,
  generate code and test code, and create code-generation-plan.md and
  code-summary.md. Build and Test handles test execution and Bolt records. Do
  not finalize traceability or the state's phase.
---

# amadeus-construction-code-generation

## Purpose

Advance only Construction Stage 3.5 Code Generation for the target Unit.

This is an internal skill called from the `amadeus` entrypoint while a Bolt is
being executed.

Build an implementation plan from the target Unit's design artifacts as
input, then generate code and test code.

## Prerequisites

Assume the target record's `aidlc-state.md` has `code-generation` as an
executable Stage Progress item, and the CONSTRUCTION PHASE `Per unit:
<unit-id>` block has the `code-generation` checkbox in one of these states:
`[ ]`, `[-]`, `[?]`, or `[R]`.

If the checkbox is `[?]`, resume from gate presentation without recreating
the artifacts.

If the checkbox is `[R]`, present the previous artifacts and the requested
changes, then make only the necessary corrections.

In both cases, do not restart the whole procedure.

Implement in the target Bolt's branch and worktree. The `amadeus` entrypoint's
Bolt start processing creates the branch and isolates the worktree; this
skill works inside the worktree.

Read at least the following inputs:

- `inception/units-generation/unit-of-work.md` for the target Unit. If Units
  Generation was not executed, use the Intent module files and requirements
  as the implicit Unit.
- `inception/requirements-analysis/requirements.md`, if Requirements Analysis
  was executed. For security-patch, use
  `construction/<unit-id>-<slug>/nfr-requirements/security-requirements.md`
  as the source of requirements.
- Artifacts under `construction/<unit-id>-<slug>/functional-design/`,
  `nfr-design/`, and `infrastructure-design/`, if executed.
- `inception/practices-discovery/team-practices.md`, if executed.
- `aidlc-state.md`.

## Questions

Treat questions during Construction as exceptional.

Ask only when you detect a real gap that earlier artifacts did not cover.
Use the `amadeus-grilling` protocol and ask one question at a time.

If you ask questions, record them in
`construction/<unit-id>-<slug>/code-generation/code-generation-questions.md`.

## Templates

Use templates in this priority order:

1. `aidlc/spaces/<space>/memory/templates/intents/construction/code-generation/`
2. `templates/construction/code-generation/` bundled with this skill.

Do not leave unknown items blank. Write `未確認`.

## Artifacts

Create or update only the following:

- Application code and test code (minimal changes to the target repository)
- `construction/<unit-id>-<slug>/code-generation/code-generation-plan.md`
  (the implementation plan: what to change, the order of changes, and the
  verification method)
- `construction/<unit-id>-<slug>/code-generation/code-summary.md` (a summary
  of the implementation result: the files changed and the requirements
  addressed)
- `construction/<unit-id>-<slug>/code-generation/memory.md`
- `aidlc-state.md` for the target Unit checkbox and `audit/audit.md` for gate
  events
- `construction/<unit-id>-<slug>/code-generation/code-generation-questions.md`,
  only if questions were asked

## Procedure

The following procedure applies when starting from checkbox `[ ]`.

When resuming from `[?]` or `[R]`, follow the prerequisite resume rules and
run only the steps needed for gate presentation or correction.

1. Set the target Unit's `code-generation` checkbox to `[-]`.
2. Read the target Unit's design artifacts and requirements, then create
   `code-generation-plan.md`.
3. Follow the plan to generate code and test code with minimal changes.
   Match the surrounding style of the existing code (naming, comment
   density, idioms).
4. Create `code-summary.md`.
5. Record the interpretations, deviations, tradeoffs, and unresolved
   questions made during execution in
   `construction/<unit-id>-<slug>/code-generation/memory.md`.
6. Set the target Unit checkbox to `[?]`, append the `STAGE_AWAITING_APPROVAL`
   event to `audit/audit.md`, and present the gate.

For large-scale work, implementation may be delegated to a subagent.

## Gate

Show the implementation plan and a summary of the changes, then ask for
approval with exactly two options: Approve or Request Changes.

Construction gates are limited to those two options. Do not offer additional
execution for skipped stages as a gate option.

If Request Changes happens three times in a row, add Accept as-is as an
option.

When presenting a gate, wait for the human response in that turn.

If `aidlc-state.md` has `Construction Autonomy Mode: autonomous` and the
target Bolt is not a walking skeleton, do not present the gate. Continue to
the next stage.

In that case, approval evidence is recorded after the Bolt PR is merged: the
`amadeus` entrypoint's Bolt boundary processing records `STAGE_COMPLETED`
with the PR URL in Details.

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

AI-DLC v2 assigns this stage `reviewer: aidlc-architecture-reviewer-agent`
with `reviewer_max_iterations: 2`. Amadeus DLC intentionally runs no
reviewer sub-agent: independent review maps to Build and Test (Stage 3.6),
the Bolt PR's human review and CI, and this gate. The Request Changes
revision loop bounds the review iterations. See
`docs/amadeus/aidlc-v2-reviewer-mapping.md`.

AI-DLC v2 declares the `linter` and `type-check` sensors for this stage.
Amadeus DLC runs no sensor mechanism: both map to Build and Test
(Stage 3.6), which records the commands and results in
`build-test-results.md`, and to the Bolt PR's CI. See
`docs/amadeus/aidlc-v2-sensor-learn-mapping.md`.

## Prohibitions

- Do not modify the target repository outside the Bolt's worktree.
- Do not make changes beyond the target Unit's scope (improvements to
  adjacent code, unrelated refactoring).
- Do not record test execution results. Execution and recording are Build
  and Test's responsibility.
- Do not record `completed` before approval.

## Next Skill

- Continue the Bolt: `amadeus`, which resolves the next stage inside the
  Bolt.
- Validate artifact structure: `amadeus-validator`.
