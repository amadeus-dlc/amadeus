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
- 2026-07-10T03:05:00Z — Interpretation: 差分ベース点は re-scans/ 内最新 observed `24197d755`(260709-dynamic-test-size)。本 intent に prior 記録なし(#707 契約)。
- 2026-07-10T03:05:00Z — Interpretation: scope=bugfix(P3 バグ修正、leader ディスパッチで既定)。intent birth 確認は leader ディスパッチ(2026-07-10T02:59Z、ユーザー承認済みバッチ)を明示承認として代替(dynamic-test-size と同じ解釈)。
- 2026-07-10T03:05:00Z — Open question: Developer 実測により #685(verb-scoped provenance)が差分区間で既実装と判明。Issue #736 の選択肢 B「verb-scoped 消費」は足場ありだが、QUESTION_ANSWERED が resolution として境界を進める機構は verb と直交(Developer 仮説)— requirements の方式質問は「#685 既実装後の残ギャップ」として再フレームが必要。
