<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-06T00:40:00Z — HARNESS_DOC_DIRS の実測（docs/ は除外対象でない）により、requirements C-3 の「declare-docs-only 初実使用」想定を訂正した; 本 Intent の成果物は docs/ への書き込みで guard を自然に満たす。宣言が必要なのは成果物が record 内に閉じる Intent だけ
- 2026-07-06T00:45:00Z — reviewer iteration 1 の指摘（FR-2.4 の docs-only 宣言が使い分け表に欠落）を反映し、拡張ポイントを 9 行に拡張して iteration 2 READY

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
