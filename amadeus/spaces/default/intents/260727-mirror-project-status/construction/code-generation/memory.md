<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-27T13:21:49Z — u2 builder が実装前停止(第2回): FD 層分離(receipt pending 留置)と U1 実装の不変条件(complete が provenance 唯一の書き手・succeeded→pending 降格拒否)の衝突を file:line 実測で特定。E-U2CG 裁定(執行クラス — 既決契約からの一意導出): C 案 = complete 先行適用(provenance 記録の維持 = 重複 Issue ハザード排除)→ Project 照合 → 未収束時は新設降格遷移(succeeded→pending、専用理由フィールド project-sync-unsettled — P2 準拠で failureClass 非流用)。B は provenance 安全性破壊、A は承認済み FD 逸脱のため不採用。U1 の never-downgraded コメントは裁定で明示改訂。
- 2026-07-27T13:13:26Z — U1 walking skeleton 検収: ユーザー承認(実 Project 実証込み・以降 Bolt 自律続行)。R-3 実測 = addProjectV2ItemById 成功(item PVTI_lADOEcw2nM4BeiIOzg0OvpQ、Issue #1560 → Project #5)+ Status field PVTSSF_…lWE の options = Backlog/In progress/In review/Done(Ideation 不在 → safety-blocked 正観測、A-4 確認)。BR-U1-7 写像表は errors 未発火のため PROVISIONAL のまま。PR #1593 発行済(マージ承認は未取得 — 後で一括伺い)。t132 既存赤は #1594 起票。
- 2026-07-27T11:50:05Z — u1 builder が実装前停止(deviation-stop-before-implement 準拠): addProjectItem の projectId/issueNodeId 供給元が FD/AD 契約に不在(U1 主経路の実行不能ギャップ)。conductor が read-only GraphQL 実測(単一クエリでの node id+projectItems 同時取得、organization(login) での Project #5 解決)で E-U1CG 裁定を執行採用(案 A: listProjectItems 戻り拡張+MirrorProjectStatusField.projectId+手順3/4 入替、owner=organization 固定)。B 案は NFR-3 予算超過、C 案はギャップ未解決のため既決契約から一意。FD/component-methods へ申告付き追記済み。BR-U1-7 写像表の実測確定は conductor の Step 11 で実施予定。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
