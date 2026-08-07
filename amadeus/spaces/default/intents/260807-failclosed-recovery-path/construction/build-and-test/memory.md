<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-08-07T10:05:00Z — §13 学習選定選挙 E-FCR-BTS13(ソロ選挙、--trigger auto)成立 2-0: choice 1「persist 0件」採用。GoA[E-FCR-BTS13]: 1x1 2x1。subagent-2 留保の転記(GoA 2): Tradeoffs 候補が引く `c3-260805` の原実測は「既存事象」の切り分けだが本件欠陥(#2403)は本 intent Bolt 3 由来 — source byte 同一により bt-20260730-2 の字義は満たし、ゲート開示+Issue 起票で義務は保存されるため今回は受理。**「自 intent 由来 latent 欠陥の別 PR 送り」同型が再発したら独立 persist の再提案対象**。選挙記録: `amadeus/spaces/default/elections/260807-e-fcr-bts13/record.md`。

- 2026-08-07T09:40:00Z — Comprehensive 戦略の執行形は `cid:build-and-test:bt-20260730-1`(brownfield バグバッチ)に従い、フルスイート正規判定 = 各 PR のマージ時 CI green(#2387/#2389/#2392/#2393)、ローカル = focused 10 ファイル再実行。性能/セキュリティは対応 NFR 不在につき専用試験を新設せず適用外根拠+既存面を指示書へ明記(`cid:build-and-test:c4` / `c3`)。
- 2026-08-07T09:40:00Z — focused バッチの fail 1 件(t458)は切り分け実測で t480 integration(本 intent Bolt 3 で追加)のプロセスグローバル状態未復元による順序依存クロストークと帰属(t458 単独 8/8 green ×2、最小2ファイル決定的再現 ×2、source は origin/main と byte 同一)。機序の一意確定は未了のまま部分特定として **Issue #2403** を起票(bug/P2/S3)。恒久修正は別 PR(検証コマンド再実行と TDD を要するため本 B&T 段では実施せず、ゲートで開示)。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

- 2026-08-07T09:40:00Z — Step 10 の「2 attempts で修復できなければ記録してゲートへ」を、修復でなく**帰属の立証**(既存/自 intent 由来の切り分け+Issue 起票)で履行(`cid:build-and-test:c3-260805-subagent-type-guard` の切り分け履行形)。#2403 は latent(CI 現行順序で未発現)のため in-stage 修正よりも独立 PR での TDD 修正が適切と判断。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
