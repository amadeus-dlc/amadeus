# Ideation

## 実現可能性

| 観点 | 状態 | メモ |
|---|---|---|
| 技術 | feasible | 既存の `amadeus-discovery` mode に説明と分岐を追加し、読み取り専用の出力契約として整理できる。 |
| 運用 | feasible | `.amadeus/` を更新しないため、次 Intent 候補を確認したいだけの場面で既存の Discovery 成果物作成と分けて使える。 |
| セキュリティ | feasible | 入力は `.amadeus/` 成果物、Issue、PR、validator 結果、evaluator 結果、CI 結果であり、秘密情報の保存や外部学習基盤を前提にしない。 |
| 依存 | feasible | Issue #259 の学習分類契約と Issue #277 の過去分析、学習分類の内部 skill を参照元にできる。 |

## 体制

| 役割 | 種別 | 関心 |
|---|---|---|
| Maintainer | 判断者 | `dry-run` を読み取り専用 mode として追加する範囲、`scaffold-only` との差分、過去分析との責務境界を承認する。 |
| Agent | 実行者 | 既存成果物と外部参照を読み、Intent 候補、根拠、未確認事項、推奨次アクションを副作用なく表示する。 |
| Reviewer | 参照者 | `dry-run` が Discovery 成果物作成、Issue 作成、Intent Record 作成、Ideation 自動実行を行わないことを確認する。 |
| Validator | 構造検出者 | Ideation 成果物、リンク、状態を検出する。 |
| Evaluator | 品質評価者 | `dry-run` と `scaffold-only` の説明が読み取り専用契約と矛盾しないかを text contract で確認する候補になる。 |

## 初期モック

| モック | 目的 | ファイル |
|---|---|---|
| 初期確認 | `dry-run` が読む情報、表示する候補、禁止する副作用、次の利用先を確認する。 | [initial-confirmation.puml](mocks/initial-confirmation.puml) |

## 未確定事項

- `dry-run` の出力を Markdown 風のテキストだけにするか、機械向け JSON も含めるかは Inception で判断する。
- evaluator 結果と CI 結果をどの入力形式で渡すかは Inception で判断する。
- `dry-run` が `amadeus-history-review` と `amadeus-learning-review` を直接起動するか、呼び出し元から結果を受け取るだけにするかは Inception で判断する。
- `dry-run` の読み取り専用性を eval、validator、人間レビューのどれで確認するかは Inception で判断する。
- `existing_intent_update` と `single_intent` の判定差分は Inception で具体化する。

## 学習候補

- 読み取り専用の探索 mode と質問しない成果物作成 mode は、同じ Discovery 内でも明確に分ける必要がある。
- Intent 候補表示は過去分析と学習分類の結果を入力にできるが、その分析責務を所有しないほうが責務境界を保ちやすい。
- 自己開発では、成果物を作る前に既存 Intent との関係だけを確認する導線が必要である。
- `.amadeus/` を更新しない mode では、GitHub Issue 作成や `amadeus-ideation` 自動実行も同じく副作用として扱う必要がある。
