<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
- 2026-07-08T05:55:54Z — ADR-001 chose independent implementation over shared-module extraction even though R4 mitigation said 'port promote-self assets': porting = design-pattern reference, not code sharing; the intent-based dedup rule (different change reasons) decided it
- 2026-07-08T05:55:54Z — plan/apply separation costs one extra data structure (Plan) but buys dry-run, FR-007 reporting, and FR-009 force-audit for free
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
- 2026-07-08T05:55:54Z — GITHUB_TOKEN optional support for rate-limited CI environments noted as future extension in ADR-003; keep out of v1 unless nfr-requirements raises it
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
