# Domain Entities

## 目的

`amadeus-discovery dry-run` の候補表示で扱う概念を定義する。

Functional Design は詳細な Domain Model と Intent Contracts の管理元である。

## Domain Entity

| 識別子 | 名前 | 責務 | 関連 |
|---|---|---|---|
| DE001 | Dry-run Request | 入力テーマ、Issue、PR、検証結果などの探索対象を表す。 | DE002 |
| DE002 | Artifact Relationship | 既存 Discovery、既存 Intent、steering layer との関係を表す。 | DE001, DE003 |
| DE003 | Intent Candidate Preview | Intent 候補、分類、根拠、未確認事項を表す。 | DE002, DE004 |
| DE004 | Decision Proposal | `single_intent` などの判定案を表す。 | DE003 |
| DE005 | Recommended Candidate | `multi_intent` の場合に最初に扱う候補を表す。 | DE003, DE004 |
| DE006 | Review Result Reference | 過去分析結果または学習分類結果への参照を表す。 | DE003 |

## 関係

Dry-run Request は Artifact Relationship を導く。
Artifact Relationship は Intent Candidate Preview の根拠になる。
Intent Candidate Preview は Decision Proposal と Recommended Candidate を持つ。
Review Result Reference は Intent Candidate Preview の補助根拠になるが、過去分析と学習分類そのものを所有しない。

## Domain Map と Context Map への反映候補

| 対象 | 種別 | 候補内容 | 承認後の扱い | 根拠 |
|---|---|---|---|---|
| なし | なし | 新しい Bounded Context やコンテキスト間依存は追加しない。 | Domain Map と Context Map は更新しない。 | U001 は BC001 内の自己開発運用を扱うため。 |

## 未確認事項

なし。
