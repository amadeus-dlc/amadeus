<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
- 2026-08-14T05:22:40Z — 修正方式は A(dest クリア)+C(診断強化)を D(包含判定)より優先(D は verbatim 宣言済み設計意図の書き換え = 仕様変更に接近するため回避。decide-question auto-decision-bb0179a6)
- 2026-08-14T05:22:40Z — スコープは helper のみ + 残余 follow-up 起票(surgical。未ガード面件数は述語依存で AC 化不適。auto-decision-d9d26159)
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
