<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-26T11:00:00Z — degrade スコープの unit ディレクトリ様式(construction/fix-<n>-<slug>/code-generation/)で6 unit を編成。非交差4件を worktree 隔離 builder で並行(上限4)、#1458 は #1457 着地後に接地(amadeus-election.ts 交差の直列化)。全6修正が PR で main 着地(#1507/#1516/#1517/#1518/#1523/#1524、全てユーザー承認スカッシュマージ・CI green)。FR-7(#1388 除外コメント)投稿済み。
- 2026-07-26T11:00:00Z — workspace_requires 充足は経路(a)本線マージ(origin/main の --no-ff merge 68e3db211、完遂機械確認 parent 2・ls-files -u 0)。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-26T11:00:00Z — #1489: main が並行着地させた #1508(floor 0.005→0.05)と患部交差 → base-advance-regrounding(rebase+検出力 fixture の floor=100ms 前提再計算+両側実測再取得)で合成。逸脱でなく統合(PR 本文に根拠明記)。
- 2026-07-26T11:00:00Z — #1462: 初版 existsSync 案が coverage 計測下で性能ゲート超過(0.338/0.312)→ Dirent(withFileTypes)判定へ是正(conductor 引き取り)。ただし後続実測(#1524 で graph 非接触なのに 0.363)によりジッタ成分が支配的と判明 — ゲート自体のフレークを #1525 として起票(P2/S3 見立て、クロスレビュー待ち)。
- 2026-07-26T11:00:00Z — #1377: stateFilePath 同根は 15 probe 消費者が bare-root 解決を契約として依存(amadeus-log.ts:20-33 明記)する意図的非対称と確定 — 変更せず、Issue 化も不要と判断(設計前提であり欠陥でない。code-summary に記録)。
- 2026-07-26T11:00:00Z — model-map の impl-only hash 更新経路欠如に3 builder が遭遇 → ユーザー裁定(手更新+根拠明記)で統一運用、ギャップは #1510 起票。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-26T11:00:00Z — API 529 過負荷で builder 3名が反復死 → SendMessage 再開(worktree 明示再掲+cwd/branch 実測検証)と c5 引き取りを併用。教訓: 90秒のディスク無変化は停滞判定に不十分(builder-1377 はフルスイート実行中だった — 引き取りと builder の最終 push が競合したが patch-id 収束で実害なし)。停滞判定はテスト実行時間(10分級)を織り込むこと。
- 2026-07-26T11:00:00Z — 共有台帳衝突2種を定型解消: (a) .coverage-patch-allowlist.json の行ピン(stale 検出分の更新+E-FSPBTS13 の全エントリ照合、#1524 再接地では3ステージ blob から再導出) (b) codekb 9面+intents.json(subagent 委任、union+現在マーカー降格、85エントリ parse OK)。
- 2026-07-26T11:00:00Z — §13 学習候補(後述の選定用): (1) 相対閾値性能ゲートのジッタ帰属は「変更なし PR での同型赤」を対照に取ってから確定する(#1518 で existsSync 起因と早期帰属→#1524 の対照実測で主因はジッタと訂正。既存 rerun-red-reattribution の帰属対照面) (2) c5 停滞判定はフルスイート実行時間を織り込む(90秒無変化では不十分)。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-07-26T11:00:00Z — #1525(perf ゲートフレーク)のクロスレビュー2名成立と修正 intent 化はユーザー判断待ち。#1496/#1498 も未成立のまま残存。
