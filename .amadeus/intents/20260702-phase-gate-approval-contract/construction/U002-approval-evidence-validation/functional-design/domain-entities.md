# Domain Entities

## 目的

approval evidence の構造検査で扱う概念を、実装と eval で同じ名前で参照できるようにする。

Functional Design は詳細な Domain Model と Intent Contracts の管理元である。

## Domain Entity

| 識別子 | 名前 | 責務 | 関連 |
|---|---|---|---|
| DE001 | Approval Evidence Check | `passed` の Task Generation Gate に `kind: approval` の evidence が実在することの構造検査を表す。 | BR001, BR002 |
| DE002 | Evidence Entry | `taskGeneration.evidence` 配列の 1 項目を表す。`kind` と `path` を持つ。 | BR001, BR003 |
| DE003 | Mutated Fixture | eval で approval evidence を除去した改変済み固定入力を表す。fail の確認に使う。 | BR005 |

## 関係

- DE001 Approval Evidence Check は、DE002 Evidence Entry のうち `kind` が `approval` の項目の実在だけを確認する。
- DE003 Mutated Fixture は、DE001 の fail 挙動を実装前（RED）と実装後（GREEN）に確認する入力になる。

## Domain Map と Context Map への反映候補

| 対象 | 種別 | 候補内容 | 承認後の扱い | 根拠 |
|---|---|---|---|---|
| なし | Domain Map | 反映候補なし。BC001 自己開発運用の既存境界内の検査追加である。 | 反映しない | [D002](../../../inception/decisions/D002-bc001-reference.md) |

## 未確認事項

なし。
