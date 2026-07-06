<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-06T01:40:00Z — O-1〜O-3 を確定（単一 rule no-stub-compat / 許可リストは backward-compatibility.md 新設表 / brace glob で二重コピー 1 行宣言）。reviewer iteration 1 の重大指摘（eval 系統は自動 discovery でないため package.json 変更が必須）を precedent 実測どおり設計へ反映し、iteration 2 READY（残差の実ツリー --check 回帰 assertion の明記も追記済み）

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
