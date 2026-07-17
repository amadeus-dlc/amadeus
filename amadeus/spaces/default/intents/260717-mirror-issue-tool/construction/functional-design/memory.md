<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-17T14:49:00Z — frontend-components.md は CONDITIONAL 不適用(UI なし)で未生成 — optional produces の設計どおり。
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-07-17T14:49:00Z — iteration 1 でセンサー先行発火を怠り reviewer が FAILED を検出(manual-sensor-fire-before-gate-report の適用漏れ、本 intent で2回目); close フローの ensureGhReady 欠落(symmetric-pair-review 指摘)と error 分岐省略も同時是正、iteration 2 READY。
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
