# Terminal-route receipt audit

Issue #3188 is closed against the following evidence snapshot.

## Contract introduction

The `tla-authoring` contract first required terminal-route receipt persistence
in commit `387cbd0146` (`refactor(plugins): スコープ割当をホスト所有へ移す (#2890)`,
2026-08-11). A `git log -S 'persist the terminal-route'` history search over
the stage contract identifies that commit as the first introduction of the
requirement.

## Violations found

The 2026-08-18 reinvestigation counted nine `impl-only`/`non-target` terminal
decisions and three persisted `terminal-route-receipt` bundles. The following
six assessment executions were terminal decisions with no corresponding
persisted receipt in the evidence store at that snapshot:

| Execution | Assessment |
| --- | --- |
| `260814-open-bug-batch-6` | `amadeus/spaces/default/intents/260814-open-bug-batch-6/construction/tla-authoring/applicability-assessment.md` |
| `260814-park-provenance` | `amadeus/spaces/default/intents/260814-park-provenance/construction/tla-authoring/applicability-assessment.md` |
| `260814-unit-failure-autoelectio` | `amadeus/spaces/default/intents/260814-unit-failure-autoelectio/construction/tla-authoring/applicability-assessment.md` |
| `260815-priority-bug-batch-2` | `amadeus/spaces/default/intents/260815-priority-bug-batch-2/construction/tla-authoring/applicability-assessment.md` |
| `260815-stale-epoch-landed` | `amadeus/spaces/default/intents/260815-stale-epoch-landed/construction/tla-authoring/applicability-assessment.md` |
| `260818-priority-bug-batch-4` | `amadeus/spaces/default/intents/260818-priority-bug-batch-4/construction/tla-authoring/applicability-assessment.md` |

The three retained receipts were not retroactively minted for the six
executions above. This is a record-only disposition: the historical audit
shards remain the source of truth, and minting a new approval-bound receipt
would manufacture evidence that did not exist at the original human gate.

## Enforcement from this change onward

`applicability receipt` now fails with
`terminal-route-receipt-required` whenever the judged route is `impl-only` or
`non-target` and `--persist true` is absent. The integration test
`tests/integration/t527-terminal-receipt-persist.integration.test.ts` is the
falling proof; a terminal route can no longer print successfully while leaving
the hold-releasing evidence store empty.
