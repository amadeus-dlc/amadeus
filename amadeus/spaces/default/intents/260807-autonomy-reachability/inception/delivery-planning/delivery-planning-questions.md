# Delivery Planning 質問票 — 260807-autonomy-reachability

上流入力(consumes 全数): unit-of-work.md / unit-of-work-dependency.md / unit-of-work-story-map.md(6 Unit と DAG を編成の入力に)、requirements.md(FR-5e 順序制約)、components.md(D1 の skeleton 対象 = C2/C3 束の定義元)、scope-document.md(D1/D2 裁定の継承)。

## 質問と裁定

### D1. Bolt バッチ編成(walking skeleton 後の並行度)

[Answer]: `skeleton-u1-then-3batches` — Bolt 1 = u1(walking skeleton、単独ゲート)→ batch 2 = u2 ∥ u3 → batch 3 = u4 ∥ u6 → batch 4 = u5。AUTO_DECIDED(semi 梯子、`dp-q1-batch-layout`、basis: agent-recommendation、reviewState: unreviewed — 本 phase 境界で検収提示)。norm 根拠: self-feature の walking-skeleton Mandate+DAG/交差目録+parallel-bolts 上限

### D2. Bolt 粒度と PR 粒度

[Answer]: 執行(既決ノルムの機械適用): 1 Unit = 1 Bolt = 1 PR(cid:units-generation:c1 (b) — Bolt ごとに PR、複数 Unit を単一 PR に束ねない)。スカッシュマージで main へ(org.md Way of Working)

### D3. Construction Autonomy Mode(スケジューリング投影)

[Answer]: 執行: Intent autonomy semi の投影は `gated`(バッチ末尾ゲート — stage-protocol「approve-batch」経路)。walking skeleton(Bolt 1)は semi では人間裁定(表 #3 — #2253 既決)

## 裁定の記録

- D1: semi 梯子 AUTO_DECIDED(2026-08-07T15:00Z 頃、audit に INTENT_AUTONOMY_TRANSACTION_COMMITTED として記録)
- D2/D3: 既決ノルム・#2253 既決からの機械的一意導出(執行クラス)
- ユーザー承認: 2026-08-07T14:37:13Z(直近 HUMAN_TURN — semi 授権下の phase 内裁定。本ステージ自体の gate は phase 境界のため人間裁定で別途取得)
