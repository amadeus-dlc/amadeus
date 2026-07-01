# Business Rules

## 目的

decision review gate の判断規則と Intent Contracts を定義する。

## 業務ルール

| 識別子 | 規則 | 根拠 | 状態 |
|---|---|---|---|
| BR001 | decision review は、既存成果物と現在参照できる証拠を入力にして判断ノードを再評価する。 | R001, UC001 | accepted |
| BR002 | `grill_required` は、人間判断が必要で、既存成果物や作業ツリーだけでは解消できない不明瞭ノードに限定する。 | R002, R003, UC002 | accepted |
| BR003 | `repair_only` は、意味判断ではなく成果物構造の補修だけで解消できる場合に使う。 | R002, UC001 | accepted |
| BR004 | `follow_up_issue_candidate` は、現在 Intent の成功条件外だが小さな後続課題として扱える場合に使う。 | R002, UC002 | accepted |
| BR005 | decision review 自体は質問を実行せず、質問は `amadeus-grilling` に委譲する。 | R003, UC002 | accepted |

## 例外

| 条件 | 扱い | 根拠 |
|---|---|---|
| validator が `pass` しているが、判断ノードの意味が不明瞭である。 | `no_grill` にせず、`grill_required` を候補にする。 | R001, R005 |
| 問題が phase 成果物構造だけに閉じている。 | `repair_only` として扱い、人間判断の質問にしない。 | R002 |
| 後続 Issue 候補を実際に起票する必要がある。 | 人間承認を得てから起票する。 | R002 |

## Intent Contracts

| 識別子 | 種別 | 条件 | 根拠 | 状態 |
|---|---|---|---|---|
| PRE001 | 事前条件 | 対象 phase skill、対象 Intent、実行モードを解決できる。 | R001 | accepted |
| PRE002 | 事前条件 | 現在参照できる証拠の範囲を説明できる。 | R001, R005 | accepted |
| POST001 | 事後条件 | phase skill が次に進む処理分岐を説明できる。 | R002 | accepted |
| POST002 | 事後条件 | `grill_required` の場合、`amadeus-grilling` へ渡す一問と補足項目を説明できる。 | R003 | accepted |
| INV001 | 不変条件 | decision review 自体は質問を実行しない。 | R003 | accepted |
| INV002 | 不変条件 | validator の `pass` を質問不要または内容承認として扱わない。 | R005 | accepted |

## 未確認事項

なし。
