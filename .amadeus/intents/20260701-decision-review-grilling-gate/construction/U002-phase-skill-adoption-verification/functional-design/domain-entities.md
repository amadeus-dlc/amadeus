# Domain Entities

## 目的

公開 phase skill への採用と検証境界で扱う概念を Functional Design の Domain Model として整理する。

Functional Design は詳細な Domain Model と Intent Contracts の管理元である。

## Domain Entity

| 識別子 | 名前 | 責務 | 関連 |
|---|---|---|---|
| DE001 | Phase Skill Entry Rule | 公開 phase skill が decision review を起動時判断として参照する規則を表す。 | DE002, DE003 |
| DE002 | Mode Interaction | 実行モードと decision review outcome の関係を表す。 | DE001 |
| DE003 | Contract Boundary | Skill Contract、validator、evaluator、eval と decision review の責務境界を表す。 | DE001, DE004 |
| DE004 | Skill Artifact Pair | source skill と昇格先 skill の対応関係を表す。 | DE003 |
| DE005 | Verification Hook | template eval または contract eval で確認する項目を表す。 | DE003, DE004 |

## 関係

Phase Skill Entry Rule は Mode Interaction と Contract Boundary を参照する。
Contract Boundary は Skill Artifact Pair と Verification Hook の確認対象を決める。
Skill Artifact Pair は source skill と昇格先 skill の同期確認に使われる。
Verification Hook は、この Intent の成功条件に必要な検証だけを扱う。

## Domain Map と Context Map への反映候補

| 対象 | 種別 | 候補内容 | 承認後の扱い | 根拠 |
|---|---|---|---|---|
| なし | なし | 新しい Bounded Context やコンテキスト間依存は追加しない。 | Domain Map と Context Map は更新しない。 | U002 は BC001 内の phase skill 採用規則を扱うため。 |

## 未確認事項

なし。
