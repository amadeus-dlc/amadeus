# B001 実行メモ

## 実行方針

Functional Design の BR001〜BR007 を Git Branching Policy の文言へ写す。
agent-instruction-rules に従い、既定（phase ごとの PR）を先に肯定形で書き、統合を例外条件として続ける。
記録の型は既存の例外記録（理由と後続確認先）に合わせる。

## 対象タスク

- T001: Git Branching Policy へ phase PR 統合の小節を追加する。
- T002: branch 名の節へ仕様側統合の命名例を追加する。

## 作業順序

1. T001 で統合の小節を追加する。
2. T002 で命名例を追加する。
3. 文書全体で既存の節構造と語彙に沿っているか読み直す。

## 実装判断

- 統合の小節は「PR 作成」節の直後に「phase PR の統合」として追加した。既定（phase ごとの PR）を先頭の肯定形で書き、3 条件、統合範囲（Construction 実装は Task Generation Gate、finalization は merge イベントという分離理由込み）、記録項目、gate 独立、粒度制約との関係、途中で未確定事項が見つかった場合の既定への復帰を続けた（T001）。
- branch 名の例に `codex/issue-254-specification` を追加し、用途の 1 文を添えた（T002）。

## 未確認事項

- なし。
