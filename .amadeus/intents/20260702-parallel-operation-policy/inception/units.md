# ユニット

## 一覧

| 識別子 | 概要 | 要求 | コンテキスト | 依存 | 詳細 |
|---|---|---|---|---|---|
| U001 | 並行運用の判断基準（並行可否、統合手順、承認運用、直列化）と責務分担を、steering policy の契約として成立させる。 | R001, R002, R003, R004, R005 | BC001 | なし | [U001-parallel-operation-policy-contract.md](units/U001-parallel-operation-policy-contract.md) |

Unit の `コンテキスト` は Domain Map の `adopted` Bounded Context を参照する。

## 依存関係

| ユニット | 依存 | 理由 |
|---|---|---|
| U001 | なし | 並行可否、統合手順、承認運用、直列化の判断基準は相互に依存し、同じ policy 契約を共有する単一の価値単位であるため。 |
