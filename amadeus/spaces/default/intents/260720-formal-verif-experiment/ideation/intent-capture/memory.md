<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-20T04:40:41Z — E-OC1: 質問回答はユーザー直接裁定(AskUserQuestion)であり選挙対象外(エスカレーション正準リスト — ユーザー本人の決定は裁定そのもの)。leader へは gate 報告で申告する
- 2026-07-20T04:40:41Z — intent-capture:c1 適用: 本 intent は同日セッション(形式仕様議論+6体グリリング)で大半裁定済みのため、質問を未決3点(Alloy扱い/JVM境界/成果物の性格)に絞り、確定済み裁定は前提として成果物へ直接反映した
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-07-20T04:40:41Z — stage-protocol §3 の四モード提示(Guide/Grill/Edit/Chat)を省略し、ユーザーが実時間で在席のため AskUserQuestion 直接提示(ガイド相当)で3問を収集。質問ファイルが正本である点は維持
- 2026-07-20T04:38:00Z — 【ニアミス自己捕捉】質問ファイル起草時に [Answer] 行へ推奨案+架空受領タイムスタンプを先取り記入してしまい、コミット前に自己検出して空欄へ是正(ruling-dependent-placeholder / election-answer-after-ruling 違反類型)。回答は 04:40:41Z の実受領後にのみ記入した
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
