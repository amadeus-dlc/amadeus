# Domain Entities

## 目的

前提不成立分類と説明境界で扱う概念を Functional Design の Domain Model として整理する。

Functional Design は詳細な Domain Model と Intent Contracts の管理元である。

## Domain Entity

| 識別子 | 名前 | 責務 | 関連 |
|---|---|---|---|
| DE001 | Prerequisite Failure | stage 前提が成立しない状態を表す。 | DE002 |
| DE002 | Failure Route | `repair_only`、`upstream_feedback_required`、`follow_up_issue_candidate` の分類結果を表す。 | DE001, DE003 |
| DE003 | Repository-local Example | repo 内成果物だけで使う代表例を表す。 | DE002, DE004 |
| DE004 | Distribution-safe Explanation | 配布対象 skill で使う一般説明を表す。 | DE003, DE005 |
| DE005 | Text Contract Check | 説明境界を確認する eval 観点を表す。 | DE004 |

## 関係

Prerequisite Failure は Failure Route に分類される。

Repository-local Example は Failure Route の説明例として repo 内成果物で使われる。

Distribution-safe Explanation は、Repository-local Example を Issue 番号に依存しない説明へ置き換える。

Text Contract Check は、Distribution-safe Explanation が配布対象 skill に入っていることと、repo 内 Issue 番号前提が混入していないことを確認する。

## Domain Map と Context Map への反映候補

| 対象 | 種別 | 候補内容 | 承認後の扱い | 根拠 |
|---|---|---|---|---|
| なし | なし | 新しい Bounded Context やコンテキスト間依存は追加しない。 | Domain Map と Context Map は更新しない。 | U002 は BC001 内の前提不成立分類を扱うため。 |

## 未確認事項

なし。
