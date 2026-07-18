# Risk and Sequencing Rationale — 260717-state-mirror-fixes

上流入力(consumes 全数): requirements.md、components.md、unit-of-work.md、unit-of-work-dependency.md、unit-of-work-story-map.md、team-practices.md

## 順序付けの根拠

- risk-first: U1(#1170、P2/S3)が実害(手動修復・ツール誤拒否)を持つ側でキュー先頭(priority-vs-dependency の優先度軸)。ただし依存なしのため U2 を待たせる理由はなく並行開始可(依存軸の制約なし)
- 検証順序の1点物: C4 修復 → U2 live 18/18 実測(unit-of-work-dependency.md の直列制約)。fixture ベースの unit テストはこの制約外

## リスクと緩和(feasibility raid-log 継承+設計固有)

| # | リスク | 緩和 |
|---|---|---|
| R1 | ガードが前進系まで抑止する過剰反応 | FR-1b の両側実測テスト(requirements 継承)+ reviewer の落ちる実証要求 |
| R2 | dist 6ツリー再生成漏れ・drift | dist:check / promote:self:check を Bolt 1 検証列に必須(NFR-2)。並行 PR との交差は実 diff で再評価(c6) |
| R3 | ロック参加による set-status のレイテンシ増・lock 競合 | withAuditLock は既存 50×100ms リトライ実装(amadeus-lib.ts:4275)を再利用 — 新パラメータ導入なし。hook は spawnSync のため失敗時も非ゼロ exit で可視(NFR-1 実測済み) |
| R4 | t145 様式の並列 spawn テストの負荷起因偽赤 | fanout-load-settle-before-integration 準拠(負荷収束後に統合検証) |
| R5 | 巻き戻り検証の座礁(mirror-issue-tool state が並行作業で変動) | C4 修復を conductor 執行で原子化し、修復直後に live 実測を行う |

## Bolt ゲート方針

Bolt PR マージは都度ユーザー承認(leader 依頼のリマインド (8) 準拠)。Construction Autonomy Mode の選択(ラダープロンプト)は walking-skeleton スキップのため engine の求めに応じて記録する。
