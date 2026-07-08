<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-08T08:08:44Z — U1 NFR reviewer iteration 1: 7 findings applied. High-value catches: Windows NTFS colon problem in backup filenames (solved with dual representation — Plan.startedAtIso extended for manifest, backupTimestamp basic token for filenames, propagated to U2/U3 meta construction) and the budget arithmetic contradiction (timeouts now derive the budget: normal 31s / worst-retry 66s with NFR-001 asserting the normal path only). md5 attribution corrected to plan-time (U1 workflow-3 aligned); hardlink rejection added; upstream refs and memory verification added
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
