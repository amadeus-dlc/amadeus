# Delivery Planning 質問票 — 260718-election-ts-foundation

> 上流入力(consumes 全数): requirements.md、components.md、unit-of-work.md、unit-of-work-dependency.md、unit-of-work-story-map.md、team-practices.md

## E-OC1 証跡

> E-OC1 証跡: 質問 1 問(Bolt 経済順序)— ユーザー直接裁定(本 intent の選挙不要上書き)。他の論点の選挙不要判定根拠(1論点1行): 並行度上限 = team.md parallel-bolts(最大4 builder)既決 / スカッシュマージ・Bolt 単位 PR = org.md Way of Working 既決 / walking skeleton 要否 = project.md Walking Skeleton 規定(greenfield 要素あり→適用)既決 / 実装着手 = record PR マージ前提+ユーザー決定(issue-selection-user-decides、scope-document W-08)既決。
> 承認: 承認タイムスタンプ 2026-07-19T01:25:00Z(AskUserQuestion 回答受領)。

## 質問と回答

**Q1: Bolt 経済順序は?**

- 選択肢: A=スケルトン縦スライス先行(5 Bolt、推奨) / B=ユニット順のみ(4 Bolt) / C=統合 3 Bolt
- [Answer]: A — Bolt 1 スケルトン縦スライス(0件確認選挙の e2e 完走実証・単独ゲート)→ Bolt 2 U1 完全化 → Bolt 3 U2/U3/U4 並行 → Bolt 4 U5+機械実行器 e2e → Bolt 5 U6。(ユーザー裁定 2026-07-19)
