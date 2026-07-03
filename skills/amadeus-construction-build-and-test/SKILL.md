---
name: amadeus-construction-build-and-test
description: >-
  Internal Amadeus Construction skill. Use only for Stage 3.6 Build and Test,
  once per Bolt. Use when all Units in the Bolt have completed Code
  Generation and the build and tests must run, with the procedure and
  results recorded under construction/bolts/<bolt-id>-<slug>/. On failure,
  halt and ask the human regardless of autonomy mode. Do not fix the
  implementation or create the Bolt PR.
---

# amadeus-construction-build-and-test

## Purpose

Advance only Construction Stage 3.6 Build and Test, once for the target Bolt.

This is an internal skill called from the `amadeus` entrypoint while a Bolt is
being executed.

Run the build and tests for the whole Bolt, and record the procedure and
results.

## Prerequisites

Assume that in the target record's `aidlc-state.md`, `build-and-test` is an
executable Stage Progress item, the target Bolt is included in Project
Information's `Bolt Refs`, and the audit has `BOLT_STARTED` but not yet
`BOLT_COMPLETED`.

Confirm that the `code-generation` checkbox in the CONSTRUCTION PHASE
`Per unit: <unit-id>` block is `[x]` for every Unit bundled into the target
Bolt. If any Unit is incomplete, stop and return to `amadeus`.

The amount of testing follows the test strategy in `aidlc-state.md`'s
`Depth`. Minimal sets the floor at one test per requirement plus a happy-path
test per component. Standard verifies component boundaries, and
Comprehensive verifies exhaustively. workshop overrides only the test
strategy to Minimal.

Read at least the following:

- `construction/<unit-id>-<slug>/code-generation/code-generation-plan.md` and
  `code-summary.md` for every Unit in the target Bolt
- `inception/delivery-planning/bolt-plan.md` (the target Bolt's Definition of
  Done; if Delivery Planning was not executed, use the Intent's success
  criteria as the implicit Bolt)
- `aidlc-state.md`

## Templates

Use templates in this priority order:

1. `aidlc/spaces/<space>/memory/templates/intents/construction/build-and-test/`
2. `templates/construction/build-and-test/` bundled with this skill.

Do not leave unknown items blank. Write `未確認`.

Do not create artifacts for test types that were not run.

## Artifacts

Create or update only the following files:

Under `construction/bolts/<bolt-id>-<slug>/`:

- `build-instructions.md` (build procedure)
- `unit-test-instructions.md` (unit test procedure)
- `integration-test-instructions.md` (when integration tests were run)
- `performance-test-instructions.md` (when performance tests were run)
- `security-test-instructions.md` (when security tests were run)
- `build-and-test-summary.md` (build and test summary)
- `build-test-results.md` (test execution results; include the commands run
  and their results)
- `memory.md`

Updated directly under the record:

- `aidlc-state.md` (the `build-and-test` checkbox; update after all Bolts
  complete) and `audit/audit.md` (Bolt event records; do not place under the
  Bolt directory)

## Procedure

The following procedure is the flow for the first execution on the target
Bolt. On a re-run, redo only the steps related to the cause of the failure.

1. Confirm that the Code Generation checkbox is `[x]` for every Unit in the
   target Bolt. If any is incomplete, stop and return to `amadeus`.
2. Run the build in the Bolt's worktree, and record the procedure in
   `build-instructions.md`.
3. Run tests according to the test strategy, and record the procedure for
   each type run along with `build-test-results.md`.
4. Record in `build-and-test-summary.md` how the Definition of Done is
   satisfied.
5. Record interpretations, deviations, tradeoffs, and unresolved questions
   made during execution in `memory.md`.
6. When everything succeeds, return to the `amadeus` entrypoint. Creating the
   Bolt PR, recording the `BOLT_COMPLETED` event, and finalizing the Bolt's
   completion are done by the entrypoint's Bolt boundary processing.

If the build or tests fail, stop regardless of autonomy mode, record the
failure details in `build-test-results.md`, and confirm with the human
(halt-and-ask).

Fix the failure, under the human's instruction, as a correction to the
target Unit's Code Generation.

## Gate

Confirm this stage's completion via the Bolt PR and the human merge.

Do not present a conversational stage gate; return to the `amadeus`
entrypoint in step 6.

Set the `build-and-test` checkbox to `[x]` after all Bolts complete, and
append `STAGE_COMPLETED` (with the last Bolt PR's URL in Details) to
`audit/audit.md`.

AI-DLC v2 declares the `required-sections`, `upstream-coverage`, and
`type-check` sensors for this stage. Amadeus DLC runs no sensor mechanism:
the markdown sensors map to `amadeus-validator` structural validation and
the phase's `traceability.md`, and `type-check` maps to this stage's own
build and test execution recorded in `build-test-results.md` and the Bolt
PR's CI. See `docs/amadeus/aidlc-v2-sensor-learn-mapping.md`.

## Prohibitions

- Do not run for a Bolt that includes a Unit with incomplete Code Generation.
- Do not ignore a failure and proceed. On failure, always stop and confirm
  with the human.
- Do not leave test results as a summary only. Keep the commands run and
  their results in `build-test-results.md`.
- Do not fix the implementation in this skill. Fixing is Code Generation's
  responsibility.
- Do not create or merge the Bolt PR in this skill.

## Next Skill

- Continue: `amadeus` (the entrypoint resolves Bolt boundary processing and
  the next Bolt).
- Validate artifact structure: `amadeus-validator`.
