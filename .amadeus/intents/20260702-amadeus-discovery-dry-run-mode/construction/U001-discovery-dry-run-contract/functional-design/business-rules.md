# Business Rules

## 目的

`amadeus-discovery dry-run` が、候補表示だけを行う読み取り専用 mode として成立するための規則を定義する。

## 業務ルール

| 識別子 | 規則 | 根拠 | 状態 |
|---|---|---|---|
| BR001 | `dry-run` は `amadeus-discovery` の明示 mode として扱う。 | R001 | accepted |
| BR002 | `dry-run` は `.amadeus/` 成果物を作成または更新しない。 | R003 | accepted |
| BR003 | `dry-run` は GitHub Issue を作成しない。 | R003 | accepted |
| BR004 | `dry-run` は Intent Record を作成しない。 | R003 | accepted |
| BR005 | `dry-run` は `amadeus-ideation` を自動実行しない。 | R003 | accepted |
| BR006 | `dry-run` と `scaffold-only` は、読み取り専用と質問しない成果物作成の違いとして説明する。 | R003 | accepted |
| BR007 | `dry-run` は `amadeus-history-review` の過去分析結果を入力にできるが、過去分析を所有しない。 | R004 | accepted |
| BR008 | `dry-run` は `amadeus-learning-review` の学習分類結果を入力にできるが、学習分類を所有しない。 | R004 | accepted |
| BR009 | `multi_intent` の場合は recommended 候補を1件だけ示す。 | R002 | accepted |

## 例外

| 条件 | 扱い | 根拠 |
|---|---|---|
| 判断材料が不足している。 | `undecided` と未確認事項を表示する。 | R002 |
| 既存 Intent 更新が妥当である。 | `existing_intent_update` の判定案を表示する。 | R002 |
| 候補表示後に成果物作成へ進む。 | 人間が次の skill を明示する。 | R001, R003 |

## Intent Contracts

| 識別子 | 種別 | 条件 | 根拠 | 状態 |
|---|---|---|---|---|
| PRE001 | 事前条件 | `.amadeus/` の steering layer が存在する。 | R001 | accepted |
| PRE002 | 事前条件 | 入力テーマ、Issue、PR、検証結果のいずれかを探索対象として扱える。 | R002 | accepted |
| INV001 | 不変条件 | `dry-run` は `.amadeus/` 成果物を更新しない。 | R003 | accepted |
| INV002 | 不変条件 | `dry-run` は GitHub Issue を作成しない。 | R003 | accepted |
| INV003 | 不変条件 | `dry-run` は Intent Record を作成しない。 | R003 | accepted |
| INV004 | 不変条件 | `dry-run` は `amadeus-ideation` を自動実行しない。 | R003 | accepted |
| INV005 | 不変条件 | `dry-run` は過去分析と学習分類を所有しない。 | R004 | accepted |
| POST001 | 事後条件 | 候補、分類、根拠、未確認事項、推奨次アクションを表示できる。 | R002 | accepted |
| POST002 | 事後条件 | 成果物作成へ進む場合の次 skill を人間が判断できる。 | R001, R003 | accepted |

## 未確認事項

- 読み取り専用性を text contract だけで確認するか、実行前後の差分検証も追加するかは、B002 で確認する。
