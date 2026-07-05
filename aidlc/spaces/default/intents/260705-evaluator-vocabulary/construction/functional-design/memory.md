<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-07-05T10:40:00Z — reviewer 指摘（iteration 1）で 3 点を修正した; (1) 薄い成果物 3 点を required-sections 充足の H2 構造へ再構成、(2) 読み替えを verbatim 化し、sensors がカバーしない旧 evaluator 候補（PR 説明の不足など）は実際の検出主体 = PR レビューへ帰属（#439 候補 1 の字面からの意図的精緻化。sensors の matches glob は Construction 設計成果物系という実挙動に合わせた）、(3) WF2 に RED/GREEN 証跡採取の明示ステップを追加。
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
