# R001: Discovery Brief を記録できる

## 要求

- Amadeus 利用者が入力した大きなテーマを、Intent 化前に Discovery Brief として記録できる。
- Discovery Brief には、入力テーマ、確認した前提、判定、判定理由、推奨次アクションが含まれる。
- Discovery Brief は、後続の Ideation と Inception が参照できる粒度を保つ。

## 受け入れ条件

- 入力テーマが記録されている。
- 確認した前提が記録されている。
- 判定と判定理由が記録されている。
- 推奨次アクションが記録されている。
- Requirement、Use Case、Unit、Bolt、Task の定義を Discovery Brief 内で先取りしていない。

## 根拠

- [20260628-discovery-brief-creation.md](../../20260628-discovery-brief-creation.md) の成功条件で、入力テーマ、確認した前提、判定、判定理由、推奨次アクションの記録が求められている。
- [scope.md](../scope.md) の対象に、Discovery Brief へ記録項目を残すことが含まれている。
- [ideation.md](../ideation.md) の実現可能性で、既存の Discovery Brief 例示を前提に成立すると整理されている。

## 未確認事項

- Discovery Brief の具体的な保存操作や UI 実装は Construction 以降で確定する。
