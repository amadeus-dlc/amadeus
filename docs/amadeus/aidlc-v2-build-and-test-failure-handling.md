# AI-DLC v2 Build and Test Failure Handling

This document defines, as the judgment for Issue #392, whether to align Build and Test (Stage 3.6) failure handling with AI-DLC v2 or keep Amadeus DLC's current contract.

References:

- Repository: https://github.com/awslabs/aidlc-workflows/tree/v2
- Reference commit: `d341522e1491db4884e9127004c3882365229218`
- Failure-handling procedure: `core/amadeus-common/stages/construction/build-and-test.md` (diagnose, fix, and re-run up to 2 attempts; if unresolved, record to `test-results.md` and proceed to the gate)

## Decision

Amadeus DLC keeps its current contract as an intentional difference.

Build and Test does not fix the implementation.

The failure-handling contract is:

1. If a build or a test fails, stop regardless of the autonomy mode, record the failure in `build-test-results.md`, and confirm with a human (halt-and-ask).
2. The fix runs under human instruction, as a Code Generation fix for the target Unit.
3. The re-run after the fix redoes only the steps related to the failure cause.
4. Once everything succeeds, the `amadeus` entry point's Bolt boundary processing guides Bolt PR creation, and the human merge stands as the approval evidence.

## Comparison with Upstream

| Aspect | AI-DLC v2 | Amadeus DLC |
|---|---|---|
| Failure diagnosis | Build and Test diagnoses it | Build and Test records the failure and confirms with a human |
| Fix | Build and Test attempts up to 2 fixes | Runs as a Code Generation fix, under human instruction |
| Re-run | Re-runs the fixed steps | Re-runs only the steps related to the failure cause |
| When unresolved | Records to `test-results.md` and presents it to a human at the gate | Records at the first failure and confirms with a human immediately (halt-and-ask) |
| Final human judgment | Made at the gate | Made through halt-and-ask and the Bolt PR merge |

Under either contract, the final judgment stays with a human. The difference is whether an unattended fix attempt is inserted before handing off to a human.

## Reasons to Retain

1. **To preserve the truthfulness of the record.** Code changes are recorded in Code Generation's artifacts (`code-generation-plan.md`, `code-summary.md`). If Build and Test fixed code itself, the change would occur without going through the Code Generation record, breaking the correspondence between the artifacts and the implementation.
2. **To preserve the Bolt gate's approval target.** A Bolt PR merge is an approval of the recorded design and generated code. An unattended fix before the gate rewrites the approval target outside the record.
3. **Because halt-and-ask is the safety valve of the autonomy contract.** Autonomous mode permits gate-free execution on the condition that it stops and confirms with a human on failure. An unattended fix on failure weakens this safety valve.
4. **Because it still satisfies the intent behind upstream's bounded retries.** Upstream's "hand off to a human after at most 2 attempts" bounds the iteration. Amadeus reaches the same destination — human judgment — faster, by handing off immediately on the first failure.

## `build-test-results.md` Recording Contract

Whether it fails or succeeds, `build-test-results.md` retains:

- The commands run and their results.
- The failure content (which tests failed, the key points of the error output).
- The re-run result after the fix.

It does not retain a summary alone. This contract follows the Prohibitions of `amadeus-construction-build-and-test`.

## Relationship to the Bolt Gate

- Build and Test succeeding is a precondition for Bolt PR creation. A Bolt that is failing does not create a PR.
- A failed Bolt can be retried or skipped at human judgment (the halt-and-ask contract in lifecycle construction).
- The Bolt PR merge is the approval evidence that finalizes each stage's `[?]` to `[x]` within the Bolt (autonomous mode).

## Out of Scope

- Implementing automatic retry of fixes.
- Adding fix responsibility to Build and Test.

## Future Reconsideration Conditions

Reconsider aligning failure handling with upstream in a separate Issue if either of the following occurs:

- Operational experience accumulates showing that halting via halt-and-ask is excessive for clearly mechanical, safe fixes (e.g., typos).
- Operational experience confirms that the round trip with Code Generation dominates a Bolt's lead time.

## Related Documents

- [AI-DLC v2 Difference Response Plan](aidlc-v2-difference-response-plan.md)
- [AI-DLC v2 Reviewer Mapping](aidlc-v2-reviewer-mapping.md)
- [AI-DLC v2 Sensor and Learn Mapping](aidlc-v2-sensor-learn-mapping.md)
- [Lifecycle Construction](lifecycle/construction.md)
