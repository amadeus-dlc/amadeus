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
- [2026-07-20T03:10Z] Interpretation: feasibility:c1 適用対象は内部 seam のみ(8 seam を origin/main 断面で実測)。判定は GO+前提条件(方式選挙)— c4 様式。corpus は intent-capture 時点の9行から14行へ成長(本日 persist 分)しギャップ拡大を実測。
- [2026-07-20T03:10Z] Deviation: upstream-coverage FAILED 2件(raid-log/questions の宣言 consume = intent-statement の実参照不足)→ 本文の実依拠を明示して是正・再発火 Passed。consumes-first-drafting / body-derivation-before-header の違反実例として次回 PM 回付(自己捕捉)。
- [2026-07-20T03:10Z] Open question: C-1(#1254 方式 (a)/(b)/(c))・C-2(圧縮形 record 58 dir 規模の読み側後方互換)は requirements 選挙へ(raid-log D-1)。
