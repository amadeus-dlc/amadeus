# Logical Components — election-promotion

> 上流入力(consumes 全数): performance-requirements、security-requirements、scalability-requirements、reliability-requirements、tech-stack-decisions、business-logic-model(本文で参照)

## 論理コンポーネント

| コンポーネント | 実装位置 | 由来 |
|---|---|---|
| 選挙 CLI 5ファイル(移動) | packages/framework/core/tools/(git mv 先) | business-logic-model の移動ロジック |
| import 修正1行 | amadeus-election.ts(移動後 :46 相当)| business-logic-model / security-requirements の変更面最小 |
| スキル正本(移動) | packages/framework/core/skills/amadeus-election/ | business-logic-model のスキル昇格 |
| 配線2点 | claude manifest coreDirs+codex emit リスト | tech-stack-decisions の既習様式 |
| テスト追随 | tests/(t234〜t244 のパス更新) | reliability-requirements の検証設計 |
| 4面不在 assert | 実装時の機械確認(ls) | scalability-requirements(BR-4 = 2面配線の出典は U2 FD business-rules.md — consumes 外のため正本直読 2026-07-23) |

## 配置根拠

- 本番コードの新規行は import 1行+配線2行のみ(performance-requirements の影響ゼロと対)— 残りは全て移動と再生成
