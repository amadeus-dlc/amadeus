<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

- 2026-07-12T07:12:00Z — Interpretation: 保証機構を層別に記載(nfr-design:c4)。P-2 の文字列検査の限界(e6 留保)を設計注記に転記し「構造変更で赤くなる=偽陽性側へ倒す」方針を明文化。R-4 は kind 型を持たせない判断(過剰設計回避)を根拠付きで記録。宣言パスは per-unit(前ステージの配置ミスの教訓を適用し最初から metrics-snapshot-cli 配下)。
