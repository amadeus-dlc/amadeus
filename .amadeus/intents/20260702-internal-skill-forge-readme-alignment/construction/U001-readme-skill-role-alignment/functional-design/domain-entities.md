# Domain Entities

## 目的

README skill 役割整合で扱う概念を Functional Design の Domain Model として整理する。

Functional Design は詳細な Domain Model と Intent Contracts の管理元である。

## Domain Entity

| 識別子 | 名前 | 責務 | 関連 |
|---|---|---|---|
| DE001 | Skill Role Classification | README に載せる skill の役割分類を表す。 | DE002, DE003 |
| DE002 | Public Entrypoint Skill | 利用者が通常使う phase skill または横断的補助 skill を表す。 | DE001 |
| DE003 | Internal Skill Family | 内部 skill を workflow family ごとに整理した分類を表す。 | DE001, DE004 |
| DE004 | Compatibility Boundary | 互換性維持対象の有無と旧入口を追加しない判断を表す。 | DE001 |

## 関係

Skill Role Classification は、Public Entrypoint Skill と Internal Skill Family を分ける。

Internal Skill Family は、README で内部 skill を公開入口化せずに説明するために使う。

Compatibility Boundary は、README 分類変更時に旧入口、旧名、alias、互換層を追加するかどうかの判断に使う。

## Domain Map と Context Map への反映候補

| 対象 | 種別 | 候補内容 | 承認後の扱い | 根拠 |
|---|---|---|---|---|
| なし | なし | 新しい Bounded Context やコンテキスト間依存は追加しない。 | Domain Map と Context Map は更新しない。 | U001 は BC001 内の README skill 役割整合を扱うため。 |

## 未確認事項

なし。
