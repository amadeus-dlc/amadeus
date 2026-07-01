# ユニット

## 一覧

| 識別子 | 概要 | 要求 | コンテキスト | 依存 | 詳細 |
|---|---|---|---|---|---|
| U001 | `amadeus-discovery dry-run` の読み取り専用候補表示契約を定義する。 | R001, R002, R003, R004 | BC001 | なし | [U001-discovery-dry-run-contract.md](units/U001-discovery-dry-run-contract.md) |
| U002 | `dry-run` 契約の source skill、昇格先成果物、eval の同期検証を定義する。 | R005 | BC001 | U001 | [U002-dry-run-sync-verification.md](units/U002-dry-run-sync-verification.md) |

Unit の `コンテキスト` は Domain Map の `adopted` Bounded Context、または Inception で採用判断する境界候補を記録する。
この Intent では、既存の `BC001 自己開発運用` を参照する。

## 依存関係

| ユニット | 依存 | 理由 |
|---|---|---|
| U001 | なし | `dry-run` の候補表示契約が最初の価値単位になるため。 |
| U002 | U001 | 同期検証は `dry-run` の契約が定義されてから扱うため。 |
