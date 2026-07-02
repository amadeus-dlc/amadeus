# ユニット

## 一覧

| 識別子 | 概要 | 要求 | コンテキスト | 依存 | 詳細 |
|---|---|---|---|---|---|
| U001 | phase PR 統合の条件、単位、記録を steering policy の契約として成立させる。 | R001, R002, R003, R004 | BC001 | なし | [U001-pr-consolidation-contract.md](units/U001-pr-consolidation-contract.md) |

Unit の `コンテキスト` は Domain Map の `adopted` Bounded Context を参照する。

## 依存関係

| ユニット | 依存 | 理由 |
|---|---|---|
| U001 | なし | 統合条件、単位、記録、既存文書との整合を単一の価値単位として扱うため。 |
