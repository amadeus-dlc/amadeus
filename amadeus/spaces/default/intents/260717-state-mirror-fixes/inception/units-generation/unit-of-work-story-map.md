# Unit of Work Story Map — 260717-state-mirror-fixes

上流入力(consumes 全数): components.md、component-methods.md、services.md、component-dependency.md、decisions.md、requirements.md

## 価値の流れと unit の対応

requirements.md の Intent 分析(2欠陥の回復)を unit へ写像する。user-stories は SKIP スコープのため、価値記述は intent-statement 由来の対象顧客ベネフィットで代替する。

| Unit | 対象顧客への価値 | 対応 FR |
|---|---|---|
| U1 fix-1170-retreat-guard | チームモード並行運用の開発チーム: state 巻き戻りの根絶 → 手動修復ゼロ・Current Stage 依存ツールの誤拒否解消 | FR-1a〜1e、FR-4a/4c |
| U2 fix-1172-skip-denominator | mirror Issue 閲覧者: in-scope 分母(18/18)の正しい進捗表示 | FR-2a〜2c、FR-4b |
| (conductor 執行)C4 修復 | mirror-issue-tool record の整合回復 → #1179 の誤表示解消(U2 と合流) | FR-3a/3b |

## リリース順序

任意(並行可)。ともに単独で価値が完結し、順序の中でしか意味を持たない unit はない。
