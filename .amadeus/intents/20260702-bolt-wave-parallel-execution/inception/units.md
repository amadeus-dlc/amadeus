# ユニット

## 一覧

| 識別子 | 概要 | 要求 | コンテキスト | 依存 | 詳細 |
|---|---|---|---|---|---|
| U001 | wave の導出、並行実行、統合、まとめ承認を、Construction skill の実行契約として成立させる。 | R001, R002, R003, R004 | BC001 | なし | [U001-bolt-wave-execution-contract.md](units/U001-bolt-wave-execution-contract.md) |

Unit の `コンテキスト` は Domain Map の `adopted` Bounded Context を参照する。

## 依存関係

| ユニット | 依存 | 理由 |
|---|---|---|
| U001 | なし | wave の導出、実行、統合、承認は同じ実行契約を共有する単一の価値単位であるため。 |
