<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-06T00:55:00Z — 執筆は subagent（B001→B002 直列）、独立検証（存在・H2 数・リンク規約・validator）と reviewer 対応は conductor。validator 初回 fail は既知の Per unit: [TBD]（Corrections c2）で、docs-lang-guide への更新で pass
- 2026-07-06T00:55:00Z — subagent の実測訂正 2 件を採用: (1) 出典アンカーは sensor manifest 本体（sensors/amadeus-required-sections.md:38-62）が正 (2) runtime-graph.json に rules_in_context は記録されない（実スキーマで反証）。reviewer iteration 1 の指摘（22→32 stage 定義、アンカー欠落）は英日両版で修正し iteration 2 READY

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
