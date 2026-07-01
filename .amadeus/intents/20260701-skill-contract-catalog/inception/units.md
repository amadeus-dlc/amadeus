# ユニット

## 一覧

| 識別子 | 概要 | 要求 | コンテキスト | 依存 | 詳細 |
|---|---|---|---|---|---|
| U001 | Skill Contract の型、catalog、代表 skill 契約を扱う。 | R001, R002 | BC001 | なし | [U001-skill-contract-catalog-model.md](units/U001-skill-contract-catalog-model.md) |
| U002 | Skill Contract 生成物と `contracts:check` のずれ検出を扱う。 | R003, R004 | BC001 | U001 | [U002-skill-contract-generation-and-drift.md](units/U002-skill-contract-generation-and-drift.md) |
| U003 | validator、evaluator、decision review、learning review の Skill Contract 参照入口を扱う。 | R005 | BC001 | U001, U002 | [U003-skill-contract-consumer-integration.md](units/U003-skill-contract-consumer-integration.md) |

Unit の `コンテキスト` は Domain Map の `adopted` Bounded Context を参照する。

## 依存関係

| ユニット | 依存 | 理由 |
|---|---|---|
| U001 | なし | 型と catalog が、生成物と consumer 参照入口の前提であるため。 |
| U002 | U001 | 生成とずれ検出は Skill Contract catalog を入力にするため。 |
| U003 | U001, U002 | consumer は catalog の意味と生成済みの参照入口を前提にするため。 |
