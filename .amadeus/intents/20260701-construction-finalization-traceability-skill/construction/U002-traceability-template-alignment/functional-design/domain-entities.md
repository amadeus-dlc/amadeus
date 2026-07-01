# Domain Entities

## 目的

template と eval の整合対象を Construction 成果物内の domain model として整理する。

Functional Design は詳細な Domain Model と Intent Contracts の管理元である。

## Domain Entity

| 識別子 | 名前 | 責務 | 関連 |
|---|---|---|---|
| DE001 | Traceability Template | 新規 Construction traceability の標準構造を示す。 | BR001 |
| DE002 | Template Evaluation | 標準 template の見出し契約を検査する。 | BR002 |
| DE003 | Skill Artifact Pair | source skill と昇格先 skill の同一契約を表す。 | BR003 |
| DE004 | Example Impact Judgment | example 更新要否と対象外理由を記録する。 | BR004 |

## 関係

`Traceability Template` の見出しは `Template Evaluation` の期待見出しと一致する。
`Skill Artifact Pair` は同じ finalization 契約を説明する。
`Example Impact Judgment` は、完了済み Construction の有無に基づいて example への反映要否を決める。

## Domain Map と Context Map への反映候補

| 対象 | 種別 | 候補内容 | 承認後の扱い | 根拠 |
|---|---|---|---|---|
| なし | Domain Map | 新しい共有境界はない。 | 更新しない | Unit Design Brief |
| なし | Context Map | 新しいコンテキスト依存はない。 | 更新しない | Unit Design Brief |

## 未確認事項

なし。
