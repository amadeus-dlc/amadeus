# 追跡

## 要求からの追跡

| 要求 | アクター | ストーリー | ユースケース | ユニット | ボルト |
|---|---|---|---|---|---|
| R001 | ACT001 Maintainer | S001 | UC001 | U001 | B001 |
| R002 | ACT002 Agent | S001 | UC002 | U001 | B002 |
| R003 | ACT002 Agent | S001 | UC001, UC002 | U001 | B001, B002 |
| R004 | ACT001 Maintainer, ACT003 Reviewer | S001 | UC003 | U002 | B003 |

## 対象境界からの追跡

| 対象境界 | 要求 | ユーザーストーリー | ユースケース | ユニット | ボルト | 扱い |
|---|---|---|---|---|---|---|
| SC-IN-001 | R001 | S001 | UC001 | U001 | B001 | Git ブランチ戦略を steering policy として扱う。 |
| SC-IN-002 | R001 | S001 | UC001 | U001 | B001 | 概要と個別 policy の責務を分ける。 |
| SC-IN-003 | R002 | S001 | UC002 | U001 | B002 | branch lifecycle の判断項目として扱う。 |
| SC-IN-004 | R003 | S001 | UC001, UC002 | U001 | B001, B002 | AGENTS.md と steering policy の責務分担として扱う。 |
| SC-IN-005 | R004 | S001 | UC003 | U002 | B003 | Intent 成果物と PR 説明から参照する policy として扱う。 |
| SC-IN-006 | R004 | S001 | UC003 | U002 | B003 | 検出候補と人間判断対象を分ける。 |

## 背景からの追跡

| 目的 | アクター | 外部システム | 要求 |
|---|---|---|---|
| Git ブランチ戦略を Amadeus の steering policy として定義する。 | ACT001 Maintainer, ACT002 Agent, ACT003 Reviewer | EXT001 GitHub | R001, R002, R003, R004 |
| 複数 Intent、複数 worktree、複数 Agent の作業判断を追跡できるようにする。 | ACT001 Maintainer, ACT002 Agent | EXT001 GitHub | R002, R004 |

## ボルトからの追跡

| ボルト | ユニット | 要求 |
|---|---|---|
| B001 | U001 | R001, R003 |
| B002 | U001 | R002, R003 |
| B003 | U002 | R004 |

## 設計からの追跡

| 設計 | ユニット | 要求 | ユースケース | ボルト |
|---|---|---|---|---|
| [design.md](units/U001-git-branching-policy/design.md) | U001 | R001, R002, R003 | UC001, UC002 | B001, B002 |
| [design.md](units/U002-policy-traceability-validation/design.md) | U002 | R004 | UC003 | B003 |

## 既存コード分析からの追跡

| 分析 | 要求 | ユースケース | ユニット | ボルト | 設計 | 入力 |
|---|---|---|---|---|---|---|
| [codebase-analysis.md](codebase-analysis.md) | R001, R002, R003 | UC001, UC002 | U001 | B001, B002 | [design.md](units/U001-git-branching-policy/design.md) | 既存 policy、AGENTS.md、development.md から policy 配置と branch lifecycle の入力を渡す。 |
| [codebase-analysis.md](codebase-analysis.md) | R004 | UC003 | U002 | B003 | [design.md](units/U002-policy-traceability-validation/design.md) | Intent traceability、acceptance、PR 説明、validator または evaluator の検出境界の入力を渡す。 |

## ユニットからの追跡

| ユニット | コンテキスト | 要求 | ユースケース | ボルト |
|---|---|---|---|---|
| U001 | BC001 | R001, R002, R003 | UC001, UC002 | B001, B002 |
| U002 | BC001 | R004 | UC003 | B003 |

## ドメインモデルからの追跡

| 種別 | 対象 | 要求 | ユースケース | 定義元 |
|---|---|---|---|---|
| サブドメイン | SD001 自己開発運用 | R001, R002, R003, R004 | UC001, UC002, UC003 | [domain-map.md](../../../domain-map.md) |
| 境界づけられたコンテキスト | BC001 自己開発運用 | R001, R002, R003, R004 | UC001, UC002, UC003 | [domain-map.md](../../../domain-map.md) |

## 依存関係からの追跡

| 種別 | 対象 | 依存 | 理由 | 定義元 |
|---|---|---|---|---|
| インテント | 20260701-git-branching-policy | 20260701-self-development-cycle-stage-workspace | stage と workspace 対応記録を branch 戦略の前提にするため。 | [intents.md](../../../intents.md) |
| 要求 | R001 | なし | policy として採用する判断と配置が、他の要求の前提であるため。 | [requirements.md](requirements.md) |
| 要求 | R002 | R001 | branch lifecycle ルールは、配置された policy の具体内容として定義するため。 | [requirements.md](requirements.md) |
| 要求 | R003 | R001 | AGENTS.md との責務分担は、steering policy の役割を前提にするため。 | [requirements.md](requirements.md) |
| 要求 | R004 | R001, R002, R003 | 参照と検出境界は、policy 配置、branch lifecycle、操作指示との責務分担を前提にするため。 | [requirements.md](requirements.md) |
| ユーザーストーリー | S001 | なし | Maintainer が branch 戦略と例外判断を確認できる価値を表すため。 | [user-stories.md](user-stories.md) |
| ユースケース | UC001 | なし | policy の配置と責務分担は branch lifecycle の前提であるため。 | [use-cases.md](use-cases.md) |
| ユースケース | UC002 | UC001 | branch lifecycle は配置済み policy の具体ルールとして扱うため。 | [use-cases.md](use-cases.md) |
| ユースケース | UC003 | UC001, UC002 | policy compliance の確認は、配置と lifecycle ルールを前提にするため。 | [use-cases.md](use-cases.md) |
| ユニット | U001 | なし | Git ブランチ戦略 policy の配置と branch lifecycle が参照と検出境界の前提であるため。 | [units.md](units.md) |
| ユニット | U002 | U001 | policy 参照と検出境界は、配置済み policy と branch lifecycle ルールを前提にするため。 | [units.md](units.md) |
| ボルト | B001 | なし | policy の配置と導線は具体ルールの前提であるため。 | [bolts.md](bolts.md) |
| ボルト | B002 | B001 | branch lifecycle ルールは個別 policy の配置を前提にするため。 | [bolts.md](bolts.md) |
| ボルト | B003 | B001, B002 | policy 参照と検出境界は、配置済み policy と具体ルールを前提にするため。 | [bolts.md](bolts.md) |
| 判断 | D001 | なし | Inception の所有境界を固定するため。 | [decisions.md](decisions.md) |
| 判断 | D002 | D001 | Unit のコンテキストに採用済み BC001 を使うため。 | [decisions.md](decisions.md) |
| 判断 | D003 | D001, D002 | Unit と Bolt の粒度を固定するため。 | [decisions.md](decisions.md) |
