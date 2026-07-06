<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-07-05T10:10:00Z — reviewer 指摘（iteration 1）で 2 点を修正した; (1) amadeus-templates eval が旧文言をハードコード assert している事実を R002 に組み込み（fixture 追随を同一 PR、自然な RED→GREEN）、(2) Skill Contract の consumer role evaluator は #240 廃止機構と別の生きた概念と判定し、R003 を 3 分類の判定表方式へ変更（別概念は対象外、改名要否は disposition で別議論として記録）。
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
