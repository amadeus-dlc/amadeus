# 追跡

## 要求からの追跡

| 要求 | アクター | ストーリー | ユースケース | ユニット | ボルト |
|---|---|---|---|---|---|
| R001 | ACT001 Maintainer | S001 | UC001 | U001 | B001 |
| R002 | ACT001 Maintainer | S001 | UC001, UC003 | U001 | B001 |
| R003 | ACT002 Agent | S001 | UC002, UC003 | U002 | B002 |
| R004 | ACT002 Agent | S001 | UC002, UC003 | U002 | B002 |

## 対象境界からの追跡

| 対象境界 | 要求 | ユーザーストーリー | ユースケース | ユニット | ボルト | 扱い |
|---|---|---|---|---|---|---|
| SC-IN-001 | R001 | S001 | UC001 | U001 | B001 | stage 判定語彙を Inception の対象として扱う。 |
| SC-IN-002 | R002 | S001 | UC001, UC003 | U001 | B001 | stage0 採用判断を Inception の対象として扱う。 |
| SC-IN-003 | R003, R004 | S001 | UC002, UC003 | U002 | B002 | workspace 対応記録と検証証拠を Inception の対象として扱う。 |
| SC-IN-004 | R002, R003, R004 | S001 | UC003 | U001, U002 | B001, B002 | 後続 Intent が参照する追跡方法を Inception の対象として扱う。 |

## 背景からの追跡

| 目的 | アクター | 外部システム | 要求 |
|---|---|---|---|
| 自己開発 cycle の stage 判定と workspace 対応記録を定義する。 | ACT001 Maintainer, ACT002 Agent, ACT003 Reviewer | EXT001 GitHub | R001, R002, R003, R004 |
| Issue #233 を先行 Intent から後続 Intent として扱う。 | ACT001 Maintainer | EXT001 GitHub | R001, R002, R003, R004 |

## ボルトからの追跡

| ボルト | ユニット | 要求 |
|---|---|---|
| B001 | U001 | R001, R002 |
| B002 | U002 | R003, R004 |

## 設計からの追跡

| 設計 | ユニット | 要求 | ユースケース | ボルト |
|---|---|---|---|---|
| [design.md](units/U001-stage-adoption/design.md) | U001 | R001, R002 | UC001, UC003 | B001 |
| [design.md](units/U002-workspace-provenance/design.md) | U002 | R003, R004 | UC002, UC003 | B002 |

## 既存コード分析からの追跡

| 分析 | 要求 | ユースケース | ユニット | ボルト | 設計 | 入力 |
|---|---|---|---|---|---|---|
| [codebase-analysis.md](codebase-analysis.md) | R001, R002 | UC001, UC003 | U001 | B001 | [design.md](units/U001-stage-adoption/design.md) | stage 判定語彙、stage0 採用条件、Maintainer の採用判断。 |
| [codebase-analysis.md](codebase-analysis.md) | R003, R004 | UC002, UC003 | U002 | B002 | [design.md](units/U002-workspace-provenance/design.md) | workspace 対応記録、tool provenance、検証証拠。 |

## ユニットからの追跡

| ユニット | コンテキスト | 要求 | ユースケース | ボルト |
|---|---|---|---|---|
| U001 | BC001 | R001, R002 | UC001, UC003 | B001 |
| U002 | BC001 | R003, R004 | UC002, UC003 | B002 |

## ドメインモデルからの追跡

| 種別 | 対象 | 要求 | ユースケース | 定義元 |
|---|---|---|---|---|
| サブドメイン | SD001 自己開発運用 | R001, R002, R003, R004 | UC001, UC002, UC003 | [domain-map.md](../../../domain-map.md) |
| 境界づけられたコンテキスト | BC001 自己開発運用 | R001, R002, R003, R004 | UC001, UC002, UC003 | [domain-map.md](../../../domain-map.md) |

## 依存関係からの追跡

| 種別 | 対象 | 依存 | 理由 | 定義元 |
|---|---|---|---|---|
| インテント | 20260701-self-development-cycle-stage-workspace | 20260629-self-dev-steering-layer | 先行 Intent の D002 により、Issue #233 を後続 Intent として扱うため。 | [intents.md](../../../intents.md) |
| 要求 | R001 | なし | stage 判定語彙は他の要求の前提であるため。 | [requirements.md](requirements.md) |
| 要求 | R002 | R001 | stage0 採用判断は stage 判定語彙を前提にするため。 | [requirements.md](requirements.md) |
| 要求 | R003 | R001 | workspace 対応記録には stage 判定を含めるため。 | [requirements.md](requirements.md) |
| 要求 | R004 | R002, R003 | 検証証拠は stage0 採用判断と workspace 対応記録の根拠になるため。 | [requirements.md](requirements.md) |
| ユーザーストーリー | S001 | なし | Maintainer の stage0 採用判断価値を表すため。 | [user-stories.md](user-stories.md) |
| ユースケース | UC001 | なし | stage 方針は他の相互作用の前提であるため。 | [use-cases.md](use-cases.md) |
| ユースケース | UC002 | UC001 | workspace 対応記録には stage 判定を含めるため。 | [use-cases.md](use-cases.md) |
| ユースケース | UC003 | UC001, UC002 | stage0 採用判断は stage 方針と workspace 対応記録を前提にするため。 | [use-cases.md](use-cases.md) |
| ユニット | U001 | なし | stage 判定語彙と採用条件は workspace 対応記録の前提であるため。 | [units.md](units.md) |
| ユニット | U002 | U001 | workspace 対応記録には stage 判定を含めるため。 | [units.md](units.md) |
| ボルト | B001 | なし | stage 方針記録は workspace provenance 記録の前提であるため。 | [bolts.md](bolts.md) |
| ボルト | B002 | B001 | workspace provenance 記録には stage 判定の根拠を含めるため。 | [bolts.md](bolts.md) |
| 判断 | D001 | なし | Inception の所有境界を固定するため。 | [decisions.md](decisions.md) |
| 判断 | D002 | D001 | BC001 を採用して Unit のコンテキストを確定するため。 | [decisions.md](decisions.md) |
| 判断 | D003 | D001, D002 | Unit と Bolt の粒度を固定するため。 | [decisions.md](decisions.md) |
