# ユニット

## 一覧

| 識別子 | 概要 | 要求 | コンテキスト | 依存 | 詳細 |
|---|---|---|---|---|---|
| U001 | 共有インデックスの生成物化を、再生成スクリプト、validator 検査、writer skill 手順、既存データ適合の契約として成立させる。 | R001, R002, R003, R004, R005, R006, R007 | BC001 | なし | [U001-shared-index-generation-contract.md](units/U001-shared-index-generation-contract.md) |

Unit の `コンテキスト` は Domain Map の `adopted` Bounded Context を参照する。

## 依存関係

| ユニット | 依存 | 理由 |
|---|---|---|
| U001 | なし | 定義元の移設、再生成、検査、手順更新、migration は同じ生成契約を共有する単一の価値単位であるため。 |
