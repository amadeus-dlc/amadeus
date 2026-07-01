# ユニット

## 一覧

| 識別子 | 概要 | 要求 | コンテキスト | 依存 | 詳細 |
|---|---|---|---|---|---|
| U001 | README の skill 分類と実在する `amadeus-*` skill の役割をそろえる。 | R001, R004, R005 | BC001 | なし | [U001-readme-skill-role-alignment.md](units/U001-readme-skill-role-alignment.md) |
| U002 | `skill-forge` の確認範囲と source skill / 昇格先成果物の整合確認を定義する。 | R002, R003, R005 | BC001 | U001 | [U002-skill-forge-review-contract.md](units/U002-skill-forge-review-contract.md) |

Unit の `コンテキスト` は Domain Map の `adopted` Bounded Context を参照する。

## 依存関係

| ユニット | 依存 | 理由 |
|---|---|---|
| U001 | なし | README 分類の棚卸しが、skill-forge 確認範囲を決める前提であるため。 |
| U002 | U001 | skill-forge 確認範囲は、README の公開入口と内部 skill の分類を前提にするため。 |
