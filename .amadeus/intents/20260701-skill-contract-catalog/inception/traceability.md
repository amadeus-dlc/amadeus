# 追跡

## 要求からの追跡

| 要求 | アクター | ストーリー | ユースケース | ユニット | ボルト |
|---|---|---|---|---|---|
| R001 | ACT002 Agent, ACT001 Maintainer | S001 | UC001 | U001 | B001 |
| R002 | ACT002 Agent, ACT001 Maintainer | S001 | UC001 | U001 | B001 |
| R003 | ACT002 Agent | S001 | UC002 | U002 | B002 |
| R004 | ACT002 Agent | S001 | UC002 | U002 | B002 |
| R005 | ACT003 Validator, ACT004 Evaluator, ACT002 Agent | S001 | UC003 | U003 | B003 |

## 対象境界からの追跡

| 対象境界 | 要求 | ユーザーストーリー | ユースケース | ユニット | ボルト | 扱い |
|---|---|---|---|---|---|---|
| SC-IN-001 | R001 | S001 | UC001 | U001 | B001 | Skill Contract 型と catalog として扱う。 |
| SC-IN-002 | R002 | S001 | UC001 | U001 | B001 | 代表 skill の契約要素として扱う。 |
| SC-IN-003 | R003 | S001 | UC002 | U002 | B002 | `references/skill-contract.md` 相当の生成物として扱う。 |
| SC-IN-004 | R004 | S001 | UC002 | U002 | B002 | `contracts:generate` と `contracts:check` の対象として扱う。 |
| SC-IN-005 | R005 | S001 | UC003 | U003 | B003 | validator または evaluator の参照入口として扱う。 |
| SC-IN-006 | R005 | S001 | UC003 | U003 | B003 | #257 と #259 の review 入力として扱う。 |

## 背景からの追跡

| 目的 | アクター | 外部システム | 要求 |
|---|---|---|---|
| Skill 実行契約を `SKILL.md` の自然文だけに閉じず、機械参照できる契約として扱う。 | ACT002 Agent, ACT001 Maintainer | なし | R001, R002 |
| Skill Contract から配布先と validator 参照用の生成物を作る。 | ACT002 Agent | EXT001 CI | R003, R004 |
| validator、evaluator、decision review、learning review が同じ Skill Contract を入力にする。 | ACT003 Validator, ACT004 Evaluator, ACT002 Agent | なし | R005 |

## ボルトからの追跡

| ボルト | ユニット | 要求 |
|---|---|---|
| B001 | U001 | R001, R002 |
| B002 | U002 | R003, R004 |
| B003 | U003 | R005 |

## 設計からの追跡

| 設計 | ユニット | 要求 | ユースケース | ボルト |
|---|---|---|---|---|
| [design.md](units/U001-skill-contract-catalog-model/design.md) | U001 | R001, R002 | UC001 | B001 |
| [design.md](units/U002-skill-contract-generation-and-drift/design.md) | U002 | R003, R004 | UC002 | B002 |
| [design.md](units/U003-skill-contract-consumer-integration/design.md) | U003 | R005 | UC003 | B003 |

## 既存コード分析からの追跡

| 分析 | 要求 | ユースケース | ユニット | ボルト | 設計 | 入力 |
|---|---|---|---|---|---|---|
| [codebase-analysis.md](codebase-analysis.md) | R001, R002 | UC001 | U001 | B001 | [design.md](units/U001-skill-contract-catalog-model/design.md) | `amadeus-contracts/catalog/**` と代表 skill の `SKILL.md` を入力にする。 |
| [codebase-analysis.md](codebase-analysis.md) | R003, R004 | UC002 | U002 | B002 | [design.md](units/U002-skill-contract-generation-and-drift/design.md) | `dev-scripts/amadeus-contracts.ts` と contract eval を入力にする。 |
| [codebase-analysis.md](codebase-analysis.md) | R005 | UC003 | U003 | B003 | [design.md](units/U003-skill-contract-consumer-integration/design.md) | validator 生成物、Issue #257、Issue #259 を入力にする。 |

## ユニットからの追跡

| ユニット | コンテキスト | 要求 | ユースケース | ボルト |
|---|---|---|---|---|
| U001 | BC001 | R001, R002 | UC001 | B001 |
| U002 | BC001 | R003, R004 | UC002 | B002 |
| U003 | BC001 | R005 | UC003 | B003 |

## ドメインモデルからの追跡

| 種別 | 対象 | 要求 | ユースケース | 定義元 |
|---|---|---|---|---|
| サブドメイン | SD001 自己開発運用 | R001, R002, R003, R004, R005 | UC001, UC002, UC003 | [domain-map.md](../../../domain-map.md) |
| 境界づけられたコンテキスト | BC001 自己開発運用 | R001, R002, R003, R004, R005 | UC001, UC002, UC003 | [domain-map.md](../../../domain-map.md) |

## 依存関係からの追跡

| 種別 | 対象 | 依存 | 理由 | 定義元 |
|---|---|---|---|---|
| Issue | #263 | #257 | decision review が Skill Contract を入力として参照するため。 | [GitHub Issue](https://github.com/amadeus-dlc/amadeus/issues/263) |
| Issue | #263 | #259 | learning review が Skill Contract の feedback 条件を入力として参照するため。 | [GitHub Issue](https://github.com/amadeus-dlc/amadeus/issues/263) |
| 要求 | R001 | なし | 型と catalog が、代表 skill 契約と生成物の前提であるため。 | [requirements.md](requirements.md) |
| 要求 | R002 | R001 | 代表 skill の契約要素は TypeScript 型で制約する必要があるため。 | [requirements.md](requirements.md) |
| 要求 | R003 | R001, R002 | 生成物は catalog の契約内容から導出するため。 | [requirements.md](requirements.md) |
| 要求 | R004 | R003 | ずれ検出は生成対象が確定してから確認できるため。 | [requirements.md](requirements.md) |
| 要求 | R005 | R003, R004 | consumer は安定した生成物と差分検出を前提に参照するため。 | [requirements.md](requirements.md) |
| ユーザーストーリー | S001 | なし | Maintainer のレビュー価値を表すため。 | [user-stories.md](user-stories.md) |
| ユースケース | UC001 | なし | catalog 定義がすべての前提であるため。 | [use-cases.md](use-cases.md) |
| ユースケース | UC002 | UC001 | 生成とずれ検出は catalog の内容を入力にするため。 | [use-cases.md](use-cases.md) |
| ユースケース | UC003 | UC002 | consumer は生成済みの契約を参照するため。 | [use-cases.md](use-cases.md) |
| ユニット | U001 | なし | 型と catalog が、生成物と consumer 参照入口の前提であるため。 | [units.md](units.md) |
| ユニット | U002 | U001 | 生成とずれ検出は Skill Contract catalog を入力にするため。 | [units.md](units.md) |
| ユニット | U003 | U001, U002 | consumer は catalog の意味と生成済みの参照入口を前提にするため。 | [units.md](units.md) |
| ボルト | B001 | なし | Skill Contract catalog が後続作業の入力であるため。 | [bolts.md](bolts.md) |
| ボルト | B002 | B001 | 生成とずれ検出は catalog を入力にするため。 | [bolts.md](bolts.md) |
| ボルト | B003 | B001, B002 | consumer 参照入口は catalog と生成物を前提にするため。 | [bolts.md](bolts.md) |
| 判断 | D001 | なし | Inception の所有境界を固定するため。 | [decisions.md](decisions.md) |
| 判断 | D002 | D001 | BC001 を採用済みコンテキストとして参照するため。 | [decisions.md](decisions.md) |
| 判断 | D003 | D001 | 生成参照文書を手書きしない方針を固定するため。 | [decisions.md](decisions.md) |
| 判断 | D004 | D001, D002, D003 | Unit と Bolt の粒度を固定するため。 | [decisions.md](decisions.md) |
