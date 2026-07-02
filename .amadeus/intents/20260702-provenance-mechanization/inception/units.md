# ユニット

## 一覧

| 識別子 | 概要 | 要求 | コンテキスト | 依存 | 詳細 |
|---|---|---|---|---|---|
| U001 | provenance 記録の生成、照合、標準検証組み込み、文書整合、検査責務境界の追跡可能性を、信頼できる provenance 記録の契約として成立させる。 | R001, R002, R003, R004, R005 | BC001 | なし | [U001-provenance-record-contract.md](units/U001-provenance-record-contract.md) |

Unit の `コンテキスト` は Domain Map の `adopted` Bounded Context を参照する。

## 依存関係

| ユニット | 依存 | 理由 |
|---|---|---|
| U001 | なし | 記録の生成、照合、標準検証組み込み、文書整合、検査責務境界の追跡可能性を単一の価値単位として扱うため。 |
