# 小さい Intent の phase PR 統合条件

## 目標プロファイル

| フィールド | 値 | 説明 |
|---|---|---|
| goalType | technical | phase PR の統合条件を steering policy として定義する技術目標である。 |
| scope | refactor | 既存の phase ごとの PR 運用に、統合を許可する条件を追加する Intent である。 |
| labels | steering-policy, pr-consolidation, cycle-cost, self-development | steering policy、PR 統合、cycle コスト、自己開発を表す。 |

## 目的

小さい Intent の cycle 往復回数を減らすため、phase PR を統合してよい条件を steering policy として定義する。

この Intent は [Issue #310](https://github.com/amadeus-dlc/amadeus/issues/310) を根拠にする。

docs-only の契約変更でも phase ごとに PR と人間 merge を繰り返しており、内容の作成よりも PR の往復と merge 待ちが主なコストになっている。
phase の省略ではなく、phase 成果物の PR 単位の統合を許可する条件が未定義である。

## 成功条件

- 統合を許可する条件と、許可しない場合の既定（phase ごとの PR）が steering policy から読める。
- 統合 PR の説明に必要な記録項目（どの phase 成果物を含むか）が定義されている。
- 統合しても validator の phase 状態検証（state.json の gate、必須成果物）が成立する。
- 既存の phase ごとの PR 運用が引き続き有効である。
- development.md の手順と Git Branching Policy の branch 命名（`codex/issue-<n>-<phase>`）との整合が確認されている。

## 範囲

含めるもの:

- phase PR を統合してよい条件の steering policy としての定義（条件候補: 実行スコープが `refactor` または docs 系、変更対象が文書だけ、Ideation の未確定事項が事前の grilling または Issue の確定判断で解消済み）。
- 統合 PR の記録方法の定義（PR 説明に含める phase 成果物の明記、gate 判定は phase ごとに state で行う）。
- development.md と Git Branching Policy との整合確認。

含めないもの:

- Construction 実装と finalization の統合。間に merge イベントを挟むため統合できない（関連: Issue #309）。
- phase gate そのものの廃止や自動化。
- 大きい Intent（実装コードを含む、複数 Unit を持つなど）への適用。

## 現在の phase

Ideation を開始する。

Inception では、統合条件の要求化、記録項目の定義、既存 policy 文書の分析を具体化する。
