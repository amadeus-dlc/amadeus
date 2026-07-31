<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-31T09:54:02Z — RE 裁定事項8件を Q1-Q5(ユーザー裁定)と設計委譲4件に分割。FR-A2 の grep AC は plugin 配布面に限定(c1-ac-grep-surface-scope 準拠 — codekb 散文を除外)
- 2026-07-31T09:54:02Z — FR-C3 で #1838 は「モデルが検出する側」と整理 — 実装修正は Won't 維持、モデルの invariant 違反反例として活用

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-31T09:54:02Z — Q3 発火点は3点+ラッチを2点移設と比較して採用(最終安全網の維持)。Q4 は directive フィールドを stderr 強化・statusline と比較して採用(機械消費面の新設が本質)

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
