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

- 2026-08-15T (Interpretation): #3062 是正方式は選挙 E-260815-3062-LANDED-FINALIZATION で A(landed 記録方式)2-0 成立。d2/d3 は梯子 AUTO_DECIDED。
- 2026-08-15T (Deviation): 選挙 CLI の単一 question hold→再 tally バグ(#3077 起票)により tally が commit 不能となり、store API(commitTally、preservedResultDigest=null)で直接 commit して回復した。票・tally 内容は CLI の正規計算(tallyQuestions)そのもので、改変はない。
- 2026-08-15T (Deviation): #3078 の初版本文を実測前に起草し誤り(tools キー不在は虚偽)。起票直後の実測で反証し本文訂正+訂正コメントを記録。P2 違反として §13 候補に載せる。
- 2026-08-15T (Open question): FR-2 の発火配線先はセンサー資産 manifest の適用宣言から実装時に導出(推測で広げない)。
