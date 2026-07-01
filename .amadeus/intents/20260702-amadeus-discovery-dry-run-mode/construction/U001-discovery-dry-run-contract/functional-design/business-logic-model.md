# Business Logic Model

## 目的

`amadeus-discovery dry-run` を、成果物を作らずに Intent 候補と推奨次アクションを表示する読み取り専用 mode として定義する。

## 対象 Unit

U001 discovery-dry-run-contract。

## 業務ロジック

| 識別子 | ロジック | 入力 | 出力 | 根拠 |
|---|---|---|---|---|
| BL001 | `dry-run` の探索対象を受け取る。 | 入力テーマ、GitHub Issue、PR、validator 結果、evaluator 結果、CI 結果 | dry-run request | R001, R002, UC001 |
| BL002 | 既存 Discovery と既存 Intent との関係を読む。 | `.amadeus/discoveries/**`、`.amadeus/intents/**`、steering layer | artifact relationship | R002, UC001 |
| BL003 | Intent 候補、分類、根拠、未確認事項、判定案を組み立てる。 | dry-run request、artifact relationship | candidate preview | R002, UC001 |
| BL004 | `multi_intent` の場合に recommended 候補を1件示す。 | candidate preview | recommended candidate | R002, UC001 |
| BL005 | 副作用を発生させず、成果物作成へ進む場合は人間の明示した次 skill に委ねる。 | candidate preview | next action guidance | R003, UC001 |
| BL006 | 過去分析結果と学習分類結果を候補表示の入力として扱う。 | history review result、learning classification | referenced review input | R004, UC002 |

## 入力

| 入力 | 説明 | 根拠 |
|---|---|---|
| 入力テーマまたは探索対象 | `dry-run` が候補を表示する対象。 | R001, R002 |
| `.amadeus/` 成果物 | 既存 Discovery、既存 Intent、steering layer、Domain Map、Context Map。 | R002 |
| GitHub Issue、PR、CI 結果 | 外部参照として候補の根拠にする。 | R002 |
| validator 結果、evaluator 結果 | 構造検出と品質評価の結果として候補の根拠にする。 | R002 |
| history review result | 過去分析結果。 | R004 |
| learning classification | 学習分類結果。 | R004 |

## 出力

| 出力 | 説明 | 利用先 |
|---|---|---|
| artifact relationship | 既存 Discovery と既存 Intent との関係。 | 候補表示 |
| candidate preview | Intent 候補、分類、根拠、未確認事項。 | Maintainer、Agent |
| decision proposal | `single_intent`、`multi_intent`、`existing_intent_update`、`research_only`、`no_intent`、`undecided` の判定案。 | 次 skill の判断 |
| recommended candidate | `multi_intent` の場合に最初に扱う候補。 | `amadeus-ideation` などの後続入口 |
| next action guidance | 推奨次アクション。 | 人間判断 |

## 未確認事項

- 出力形式に機械向け JSON を含めるかは、Construction 実装時に確認する。
- `dry-run` が `amadeus-history-review` と `amadeus-learning-review` を直接起動するか、呼び出し元から結果を受け取るだけにするかは、Construction 実装時に確認する。
