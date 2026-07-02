# ユニット

## 一覧

| 識別子 | 概要 | 要求 | コンテキスト | 依存 | 詳細 |
|---|---|---|---|---|---|
| U001 | phase 遷移の state.json 雛形生成を同梱スクリプトと手順参照の契約として成立させる。 | R001, R002, R003, R004, R005, R006 | BC001 | なし | [U001-state-scaffold-contract.md](units/U001-state-scaffold-contract.md) |

Unit の `コンテキスト` は Domain Map の `adopted` Bounded Context を参照する。

## 依存関係

| ユニット | 依存 | 理由 |
|---|---|---|
| U001 | なし | 雛形の生成契約、配置、手順参照、検証を単一の価値単位として扱うため。 |
