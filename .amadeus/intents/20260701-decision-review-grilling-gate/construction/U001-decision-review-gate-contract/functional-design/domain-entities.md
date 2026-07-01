# Domain Entities

## 目的

decision review gate で扱う概念を Functional Design の Domain Model として整理する。

Functional Design は詳細な Domain Model と Intent Contracts の管理元である。

## Domain Entity

| 識別子 | 名前 | 責務 | 関連 |
|---|---|---|---|
| DE001 | Decision Review Input | decision review が読む入力証拠の集合を表す。 | DE002, DE003 |
| DE002 | Decision Node | phase skill が実行前に評価する判断分岐を表す。 | DE001, DE003 |
| DE003 | Decision Review Outcome | `grill_required`、`no_grill`、`repair_only`、`follow_up_issue_candidate` の分類結果を表す。 | DE002, DE004 |
| DE004 | Grilling Handoff | `amadeus-grilling` に渡す一問と補足項目を表す。 | DE003 |

## 関係

Decision Review Input は Decision Node の再評価に使われる。
Decision Node の評価結果は Decision Review Outcome に変換される。
Decision Review Outcome が `grill_required` の場合だけ Grilling Handoff を作る。
Grilling Handoff は質問実行をせず、`amadeus-grilling` と呼び出し元 phase skill の入力になる。

## Domain Map と Context Map への反映候補

| 対象 | 種別 | 候補内容 | 承認後の扱い | 根拠 |
|---|---|---|---|---|
| なし | なし | 新しい Bounded Context やコンテキスト間依存は追加しない。 | Domain Map と Context Map は更新しない。 | U001 は BC001 内の decision review 契約を扱うため。 |

## 未確認事項

なし。
