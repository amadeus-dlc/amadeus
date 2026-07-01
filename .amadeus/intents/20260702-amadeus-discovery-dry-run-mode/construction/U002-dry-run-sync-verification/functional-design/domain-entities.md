# Domain Entities

## 目的

`dry-run` 契約の同期検証で扱う概念を定義する。

Functional Design は詳細な Domain Model と Intent Contracts の管理元である。

## Domain Entity

| 識別子 | 名前 | 責務 | 関連 |
|---|---|---|---|
| DE001 | Source Skill Contract | source skill にある `dry-run` 契約を表す。 | DE002, DE003 |
| DE002 | Promoted Skill Contract | 昇格先成果物に反映された `dry-run` 契約を表す。 | DE001, DE004 |
| DE003 | Text Contract Expectation | eval が検出する文言と境界を表す。 | DE001 |
| DE004 | Verification Evidence | promote-skill、eval、validator、標準検証の結果を表す。 | DE002, DE003 |

## 関係

Source Skill Contract は promote-skill により Promoted Skill Contract へ反映される。
Text Contract Expectation は Source Skill Contract と Promoted Skill Contract の主要境界を検出する。
Verification Evidence は Construction の受け入れ証拠になる。

## Domain Map と Context Map への反映候補

| 対象 | 種別 | 候補内容 | 承認後の扱い | 根拠 |
|---|---|---|---|---|
| なし | なし | 新しい Bounded Context やコンテキスト間依存は追加しない。 | Domain Map と Context Map は更新しない。 | U002 は BC001 内の自己開発運用を扱うため。 |

## 未確認事項

なし。
