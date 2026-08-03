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

## Interpretations
- 2026-08-02T17:51:27Z — Unit 粒度は 1 Issue = 1 intent の中で AD U1〜U8 を6 Unit へ凝集(U1+U2+U8election を walking skeleton の election-readpath へ統合 — 片側だけでは価値を出荷できない境界の統合、cid:units-generation:c1 (a) の適用)。reviewer iteration 1 Major は AD 交差表(ci.yml/fixture 共有)を dependency 成果物へ持ち上げ忘れた転記漏れで、既存 cid(enumeration-completeness / 共有台帳)の執行範囲の是正。
