<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-30T23:55:00Z — 差分 base は merge-base 復元で `a38a1f4d3` を採用; 記録済み observed 3件(`c42ef4d77`/`278d61d8e`/`22ee27dbe`)が全て現 HEAD 非祖先(squash 運用の既知現象)のため cid:reverse-engineering:rescan-base-ancestry に従い祖先性実測(`git merge-base --is-ancestor` exit 0、距離25)で確定。observed は origin/main 系譜の `3f73823b1`(cid:reverse-engineering:c2-observed-mainline-commit 準拠)。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-30T23:55:30Z — 宣言センサー3種(required-sections/upstream-coverage/answer-evidence)は codekb 出力パスが sensor filter に構造不適合で発火不能(cid:reverse-engineering:re-sensors-codekb-filter-mismatch); 代替検証として機械検査を手動実施 — 全10ファイル非0バイト、H2 ≥2(最小6)、競合マーカー新規混入0(既存履歴散文の1件のみ・HEAD 同数)、observed ref `3f73823b1` の全ファイル存在(cid:reverse-engineering:c3-codekb-sensor 準拠)。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-07-30T23:56:00Z — #1773×#1772 が `amadeus-election-model.ts` で交差(#1773=OriginalBallot:134-136、#1772=Choice:48/DistributionView:306-310); Bolt 編成時に直列化か実 diff 非交差判定が必要。#1752 は完全非交差で先行着地可。
- 2026-07-30T23:56:20Z — #1772 は BR-2 の3重固定(型・コメント・t234:190 の verbatim assert)により要件段の仕様裁定+テスト契約明示改訂が前提(cid:reverse-engineering:c1-pinned-behavior-ruling); #1773 も格納分離 vs 通知抑制の方式裁定が必要。requirements-analysis で扱う。
- 2026-07-30T23:56:40Z — 区間内で t366×3/t367×2/t368×3 のテスト番号重複を実測; 本 intent の新規テスト採番は t371 より後を使い、引用はフルパスで書く。
