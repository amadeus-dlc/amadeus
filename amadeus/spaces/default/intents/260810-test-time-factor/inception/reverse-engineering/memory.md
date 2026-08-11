<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-10T14:26:50Z — `TEST_TIME_FACTOR` をテストのタイムアウト時間の係数として扱う; timeout の基準時間に係数を乗算する。`sleep(500 * testTimeFactor)` のように timeout を構成・検証する待機値にも同じ係数を適用する。性能基準や本番 CLI の timeout 契約は対象外とする。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-08-10T14:26:50Z — 全555箇所の明示 timeout の一括置換より、共通 helper・runner・CI 注入・既知の負荷依存 wait から段階適用する; 意図的 slow fixture、perf 閾値、既存 `AMADEUS_TEST_TIMEOUT` の二重乗算を回避し、変更範囲を検証可能に保つ。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
