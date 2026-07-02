# 追跡

## 要求からの追跡

| 要求 | アクター | ストーリー | ユースケース | ユニット | ボルト |
|---|---|---|---|---|---|
| R001 | ACT002 Agent | なし | UC001 | U001 | B001 |
| R002 | ACT002 Agent | なし | UC001, UC002 | U001 | B001 |
| R003 | ACT002 Agent, ACT003 Reviewer | なし | UC002, UC003 | U001 | B001 |
| R004 | ACT003 Reviewer, ACT001 Maintainer | なし | UC003 | U001 | B002 |

## 対象境界からの追跡

| 対象境界 | 要求 | ユーザーストーリー | ユースケース | ユニット | ボルト | 扱い |
|---|---|---|---|---|---|---|
| SC-IN-001 | R001, R002 | なし | UC001, UC002 | U001 | B001 | 統合条件と統合単位を policy として定義する。 |
| SC-IN-002 | R001 | なし | UC001 | U001 | B001 | 既定（phase ごとの PR）を明文化する。 |
| SC-IN-003 | R003 | なし | UC002, UC003 | U001 | B001 | 統合 PR の記録項目と gate 判定の独立を定義する。 |
| SC-IN-004 | R004 | なし | UC003 | U001 | B002 | development.md と branch 命名の整合を確認する。 |

## 背景からの追跡

| 背景 | 追跡先 | 根拠 |
|---|---|---|
| Issue #310 | R001, R002, R003, R004 | phase PR の統合条件の policy 化を求める入力であるため。 |
| Issue #314 | Ideation D001 | 親 Issue として Discovery の候補判断（依存順）を確定した入力であるため。 |
| 既存 Ideation scope | SC-IN-001 から SC-IN-004 | Inception の要求境界を Ideation の採用境界から引き継ぐため。 |
| [G001](grillings/G001-consolidation-judgments.md) | R001, R002, R004 | 統合単位（GD001）、統合条件（GD002）、記載先（GD003）の確定判断を反映するため。 |
| 直近 cycle の観察 | R001 | 2 Intent の完走に phase PR 13 本と人間 merge 13 回を要した観察を根拠にするため。 |

## ボルトからの追跡

| ボルト | ユニット | 要求 | 受け入れ状態 | Construction での主な成果 |
|---|---|---|---|---|
| B001 | U001 | R001, R002, R003 | R001, R002, R003 | Git Branching Policy へ統合条件、単位、命名、記録項目を追記する。 |
| B002 | U001 | R004 | R004 | development.md の整合を確認し、必要な補正を行う。 |

## 設計からの追跡

| 設計 | ユニット | 要求 | ユースケース | ボルト |
|---|---|---|---|---|
| [design.md](units/U001-pr-consolidation-contract/design.md) | U001 | R001, R002, R003, R004 | UC001, UC002, UC003 | B001, B002 |

## 既存コード分析からの追跡

| 分析 | 要求 | ユースケース | ユニット | ボルト | 設計 | 入力 |
|---|---|---|---|---|---|---|
| [codebase-analysis.md](codebase-analysis.md) | R001, R002 | UC001, UC002 | U001 | B001 | [design.md](units/U001-pr-consolidation-contract/design.md) | Branch Lifecycle の節構造と例外記録の型に統合条件を追記できる。 |
| [codebase-analysis.md](codebase-analysis.md) | R003 | UC002, UC003 | U001 | B001 | [design.md](units/U001-pr-consolidation-contract/design.md) | gate 判定は state で行われ PR 単位と独立している。 |
| [codebase-analysis.md](codebase-analysis.md) | R004 | UC003 | U001 | B002 | [design.md](units/U001-pr-consolidation-contract/design.md) | development.md の PR 準備条件は単数形の読みで、統合 PR との整合確認が必要である。 |

## ユニットからの追跡

| ユニット | コンテキスト | 要求 | ユースケース | ボルト |
|---|---|---|---|---|
| U001 | BC001 | R001, R002, R003, R004 | UC001, UC002, UC003 | B001, B002 |

## ドメインモデルからの追跡

| 種別 | 対象 | 要求 | ユースケース | 定義元 |
|---|---|---|---|---|
| サブドメイン | SD001 自己開発運用 | R001, R002, R003, R004 | UC001, UC002, UC003 | [domain-map.md](../../../domain-map.md) |
| 境界づけられたコンテキスト | BC001 自己開発運用 | R001, R002, R003, R004 | UC001, UC002, UC003 | [domain-map.md](../../../domain-map.md) |

Inception では詳細な Domain Model を作らない。

Domain Map と Context Map は、採用済みの Bounded Context と依存関係の参照元として使う。

## 依存関係からの追跡

| 種別 | 対象 | 依存 | 理由 | 定義元 |
|---|---|---|---|---|
| 要求 | R001 | なし | 統合条件と既定は他の要求に依存せず定義できるため。 | [requirements.md](requirements.md) |
| 要求 | R002 | R001 | 統合単位と命名は、統合を許可する条件の適用範囲を定めるため。 | [requirements.md](requirements.md) |
| 要求 | R003 | R001 | 記録項目は、統合が許可された PR に対する要求であるため。 | [requirements.md](requirements.md) |
| 要求 | R004 | R001, R002, R003 | 整合確認は、確定した条件、単位、記録項目を既存文書と突き合わせるため。 | [requirements.md](requirements.md) |
| ユースケース | UC001 | なし | 統合条件の判定は他の相互作用に依存せず成立するため。 | [use-cases.md](use-cases.md) |
| ユースケース | UC002 | UC001 | 統合 PR の作成は、条件判定で許可された場合だけ行うため。 | [use-cases.md](use-cases.md) |
| ユースケース | UC003 | UC002 | レビューと gate 判定は、作成された統合 PR の記録を入力にするため。 | [use-cases.md](use-cases.md) |
| ユニット | U001 | なし | 統合条件、単位、記録、整合を単一の価値単位として扱うため。 | [units.md](units.md) |
| ボルト | B001 | なし | 統合条件の定義が、整合確認の前提であるため。 | [bolts.md](bolts.md) |
| ボルト | B002 | B001 | 整合確認は、確定した条件文言と突き合わせるため。 | [bolts.md](bolts.md) |
| 判断 | D001 | なし | Inception の所有境界を固定するため。 | [decisions.md](decisions.md) |
| 判断 | D002 | D001 | 所有境界が決まってから Unit のコンテキスト参照を確定するため。 | [decisions.md](decisions.md) |
| 判断 | D003 | D001 | 所有境界が決まってから成果物の粒度例外を判断するため。 | [decisions.md](decisions.md) |
| Context Map | BC001 | なし | 採用済みまたは廃止済みのコンテキスト間依存は存在しないため。 | [context-map.md](../../../context-map.md) |

## Inception Gate

| 観点 | 状態 | 根拠 |
|---|---|---|
| 要求追跡 | passed | R001 から R004 までを use case、unit、bolt に対応付けた。 |
| 対象境界追跡 | passed | SC-IN-001 から SC-IN-004 までを要求と bolt に対応付けた。 |
| ドメイン参照 | passed | Unit の context は Domain Map の adopted Bounded Context である BC001 を参照する。 |
| 依存関係 | passed | Unit と Bolt の依存を明示し、Context Map に未登録依存がないことを確認した。 |
