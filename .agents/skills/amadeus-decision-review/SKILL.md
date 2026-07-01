---
name: amadeus-decision-review
description: >-
  Amadeus phase skill の起動時に、既存成果物と現在参照できる証拠から decision tree を再評価し、
  `amadeus-grilling` を起動すべきか、通常処理へ進めるか、構造補修へ戻すか、後続 Issue 候補として報告するかを判断する内部 skill。
  質問実行は行わず、必要な場合は `amadeus-grilling` への handoff を作る。
---

# amadeus-decision-review

## 目的

phase skill 起動時の意思決定を再確認する。

既存成果物、Issue、PR、作業ツリー、validator 結果、Skill Contract、信頼できる参照元を入力証拠として読み、判断ノードごとに次の処理分岐を選ぶ。

この skill は判断ゲートである。
質問実行は `amadeus-grilling` に委譲する。

## 入力

- 対象 phase skill。
- 対象 Intent または成果物セット。
- 実行モード。
- ユーザー入力。
- 既存成果物。
- Issue、PR、作業ツリー。
- validator 結果。
- Skill Contract。
- 信頼できる参照元。

## 判断ノード

| ノード | 確認内容 | 主な入力 |
|---|---|---|
| DN001 | 対象 Intent または成果物セットを解決できるか。 | ユーザー入力、`.amadeus/`、Issue |
| DN002 | phase gate または前段成果物が実行条件を満たすか。 | `state.json`、traceability、decisions |
| DN003 | 既存成果物と現在参照できる証拠だけで判断できるか。 | 既存成果物、作業ツリー、Skill Contract |
| DN004 | 構造補修だけで解ける問題か。 | validator 結果、必須見出し、リンク、state |
| DN005 | 現在 Intent の成功条件外の小さな課題か。 | scope、requirements、acceptance、Bolt |

## Outcome

| outcome | 用途 | 次の処理 |
|---|---|---|
| `grill_required` | 人間判断が必要で、既存成果物や作業ツリーだけでは解消できない。 | `amadeus-grilling` へ handoff する。 |
| `no_grill` | 既存成果物と現在参照できる証拠から判断できる。 | 通常処理へ進む。 |
| `repair_only` | 成果物構造の補修だけで解ける。 | 対象 phase skill の `repair` へ進む。 |
| `follow_up_issue_candidate` | 現在 Intent の成功条件外だが、後続 Issue 候補として扱える。 | 人間承認後に Issue 化する。 |

## Grilling Handoff

`grill_required` の場合だけ、次を呼び出し元 phase skill へ返す。

- 一問。
- 確認理由。
- 推奨回答。
- 推奨理由。
- 反映先候補。
- 判断ノード。
- 根拠となる入力証拠。

`amadeus-decision-review` は質問を表示しない。
呼び出し元 phase skill が `amadeus-grilling` の質問作法に従って一問だけ質問する。

## 境界

所有するもの:

- 入力証拠の分類。
- 判断ノードの再評価。
- outcome の分類。
- `amadeus-grilling` へ渡す handoff 項目の選定。

所有しないもの:

- `amadeus-grilling` の質問作法。
- Grilling Decision Trail の配置変更。
- validator による内容承認。
- evaluator の品質評価。
- 既存 Intent 成果物の一括移行。

## 検証境界

validator の `pass` は、実行時に参照できる最低限の構造条件を満たすという意味であり、内容承認ではない。
evaluator の結果は品質評価であり、採用先は phase skill または人間判断で分類する。
Skill Contract は入力証拠と境界情報であり、decision review の結果そのものではない。

## 禁止事項

- 質問を実行しない。
- 複数の質問を並べない。
- Grilling Decision Trail の構造を変更しない。
- validator の `pass` を質問不要の根拠として単独採用しない。
- 現在 Intent の成功条件外の課題を、現在成果物へ混ぜない。
