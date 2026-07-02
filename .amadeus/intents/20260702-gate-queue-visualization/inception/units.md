# ユニット

## 一覧

| 識別子 | 概要 | 要求 | コンテキスト | 依存 | 詳細 |
|---|---|---|---|---|---|
| U001 | 承認待ちキューの一覧を、契約準拠の判定、横断スキャン、Markdown 表出力、配布、検証先行の契約として成立させる。 | R001, R002, R003, R004, R005 | BC001 | なし | [U001-approval-queue-listing-contract.md](units/U001-approval-queue-listing-contract.md) |

Unit の `コンテキスト` は Domain Map の `adopted` Bounded Context を参照する。

## 依存関係

| ユニット | 依存 | 理由 |
|---|---|---|
| U001 | なし | スキャン、判定、出力、配布、検証は同じ一覧契約を共有する単一の価値単位であるため。 |
