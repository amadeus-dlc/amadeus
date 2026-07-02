# `amadeus-discovery` dry-run mode

## 概要

`amadeus-discovery` に読み取り専用の `dry-run` mode を追加する。

## 依存

| 依存 | 理由 |
|---|---|
| 20260701-history-learning-review-skills | Issue #272 は、過去分析と学習分類の結果を入力にできる読み取り専用の Intent 候補探索を扱うため。 |

## 目標プロファイル

| フィールド | 値 | 説明 |
|---|---|---|
| goalType | technical | Amadeus の Discovery skill に読み取り専用の候補探索 mode を追加する技術目標である。 |
| scope | refactor | 既存の Discovery mode と学習分類の契約を前提に、`dry-run` の責務を追加する Intent である。 |
| labels | discovery, dry-run, intent-backlog, self-development, readonly | Discovery、読み取り専用、Intent 候補探索、自己開発を表す。 |

## 目的

`amadeus-discovery` に、成果物を書かずに Intent 候補と推奨次アクションを表示する `dry-run` mode を追加する。

この Intent は [Issue #272](https://github.com/amadeus-dlc/amadeus/issues/272) を根拠にする。

既存の `scaffold-only` は、質問せずに Discovery 成果物を作る mode である。
一方で、自己開発では `.amadeus/`、既存 Discovery、既存 Intent、Issue、validator 結果、evaluator 結果、CI 結果を見て、まだ成果物を作らずに次の Intent 候補だけを確認したい場面がある。

`dry-run` は、その場面で入力テーマ、既存 Discovery との関係、既存 Intent との関係、候補、分類、根拠、未確認事項、推奨次アクションを表示する。
`.amadeus/` 配下の成果物更新、GitHub Issue 作成、`amadeus-ideation` の自動実行は行わない。

## 成功条件

- `amadeus-discovery` に `dry-run` mode の説明が追加されている。
- `dry-run` が読み取り専用であることが明記されている。
- `dry-run` と `scaffold-only` の違いが説明されている。
- `dry-run` の出力に、候補、分類、根拠、未確認事項、推奨次アクションが含まれる。
- `dry-run` では `.amadeus/` 配下のファイルを作成または更新しないことが明記されている。
- 自己開発で `.amadeus/` 全体から次 Intent 候補を探索する用途を扱える。
- `dry-run` が `amadeus-history-review` または `amadeus-learning-review` の結果を入力にできることが説明されている。
- 過去分析、学習分類、Intent 候補表示の責務が混ざらないように説明されている。

## 範囲

含めるもの:

- `amadeus-discovery dry-run` の責務。
- `dry-run` が読む `.amadeus/` 成果物と外部参照の範囲。
- `dry-run` が表示する候補、分類、根拠、未確認事項、推奨次アクション。
- `single_intent`、`multi_intent`、`existing_intent_update`、`research_only`、`no_intent`、`undecided` の判定案。
- `multi_intent` の場合に recommended 候補を示すこと。
- `dry-run` と `scaffold-only` の責務差分。
- `amadeus-history-review` または `amadeus-learning-review` の結果を入力にできる関係。
- source skill、昇格先成果物、eval または text contract の更新。

含めないもの:

- Discovery 成果物の構造変更。
- Intent Record の自動作成。
- GitHub Issue の自動作成。
- `amadeus-ideation` の自動実行。
- 過去分析そのものを `dry-run` に直接実装すること。
- 学習分類そのものを `dry-run` に直接実装すること。
- validator の意味検証拡張。
- 完了済み Intent の一括再分類。
- Inception の前に要求、ユースケース、Unit、Bolt、Task、実装を作ること。

## 現在の phase

Ideation を開始する。

Inception では、読み取り専用 mode の要求、出力項目、禁止する副作用、過去分析と学習分類との責務境界、検証観点を具体化する。
