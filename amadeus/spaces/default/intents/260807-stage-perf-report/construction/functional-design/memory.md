<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-07T22:12:30Z — §12a iteration 1 の BLOCKER(母集団恒等式の不成立)を受け、ExclusionCounts を平坦 7 フィールドから 3 母集団グループ(corpus / windowing / review)のネスト構造へ再設計した; 複数ソース由来のカウンタを単一構造体へ束ねるとき、恒等式(母集団検証)に参加する部分集合を母集団別に層別せず平坦な合算を恒等式に使うと、互いに素な母集団の混在で恒等式が数学的に不成立になる — requirements の FR-2 AC vi「統計母集団 = 全窓 − 除外件数」の「全窓」「除外件数」の定義を設計段で確定して初めてテスト可能になった。iteration 2 READY で閉包。zeroSecond/unclosedIdle の相互排他は FOLLOW-UP として実装段へ申し送り。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
