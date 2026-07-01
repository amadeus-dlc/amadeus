# Domain Entities

## 目的

skill-forge 確認契約で扱う概念を Functional Design の Domain Model として整理する。

Functional Design は詳細な Domain Model と Intent Contracts の管理元である。

## Domain Entity

| 識別子 | 名前 | 責務 | 関連 |
|---|---|---|---|
| DE001 | Skill Forge Review Scope | skill-forge で確認する観点の集合を表す。 | DE002, DE003 |
| DE002 | Review Target Set | 確認対象の source skill と昇格先成果物を表す。 | DE001, DE004 |
| DE003 | Review Modality | 静的 review、eval、metadata 確認などの確認方法を表す。 | DE001 |
| DE004 | Promotion And Validation Plan | 昇格手段と検証入口の組み合わせを表す。 | DE002 |

## 関係

Skill Forge Review Scope は Review Modality を選ぶ。

Review Target Set は source skill と昇格先成果物を区別する。

Promotion And Validation Plan は Review Target Set の確認結果に応じて、昇格手段と検証入口を決める。

## Domain Map と Context Map への反映候補

| 対象 | 種別 | 候補内容 | 承認後の扱い | 根拠 |
|---|---|---|---|---|
| なし | なし | 新しい Bounded Context やコンテキスト間依存は追加しない。 | Domain Map と Context Map は更新しない。 | U002 は BC001 内の skill-forge 確認契約を扱うため。 |

## 未確認事項

なし。
