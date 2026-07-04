<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-07-04T18:30:00Z — RED→GREEN で 2 種の回帰を実装中に検知・修正（marker の行折り返し分断、新設節の label 出現順序）。order 判定は orderIssues() として共通化。
- 2026-07-04T18:30:00Z — 自律実行は 2026-07-04 の人間の明示指示「残りのステージは auto で」に基づく（AUTONOMY_MODE_SET を audit に記録済み）。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

- 2026-07-04T18:30:00Z — intents.json の status 語彙が engine（in-flight）と validator（in_progress/parked/completed/complete）で不整合。in-flight 中の全 Intent で validator fail する。別 Issue 候補。
