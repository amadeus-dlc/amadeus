<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-17T20:35:02Z — runtimeのないMarkdown hygiene unitでは、性能・信頼性targetをlatency/SLAでなく12/12 field completeness、same-ref repeatability、false-green 0件として定義した; baselineのない時間targetを捏造せずtestabilityを保つため。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-17T20:35:02Z — 新しいverification service / dependencyより、既存Git・Bun・Amadeus record / sensor / CIを再利用した; boundedな固定2 path検査へruntime運用面を増やすことはscopeとriskを不必要に拡大するため。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
