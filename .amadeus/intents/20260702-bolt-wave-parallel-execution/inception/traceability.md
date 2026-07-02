# 追跡

## 要求からの追跡

| 要求 | アクター | ストーリー | ユースケース | ユニット | ボルト |
|---|---|---|---|---|---|
| R001 | ACT002 Agent | なし | UC001 | U001 | B001 |
| R002 | ACT002 Agent | なし | UC003 | U001 | B001 |
| R003 | ACT001 Maintainer | なし | UC002 | U001 | B001 |
| R004 | ACT002 Agent | なし | UC003, UC004 | U001 | B001, B002 |

## 対象境界からの追跡

| 対象境界 | 要求 | ユーザーストーリー | ユースケース | ユニット | ボルト | 扱い |
|---|---|---|---|---|---|---|
| SC-IN-001 | R001 | なし | UC001 | U001 | B001 | 依存表からの wave 導出規則を契約として定義する。 |
| SC-IN-002 | R002, R003, R004 | なし | UC002, UC003, UC004 | U001 | B001, B002 | wave 単位の実行、統合、検証、まとめ承認、直列既定を skill に定義する。 |
| SC-IN-003 | R002 | なし | UC003 | U001 | B001 | worktree 分離と直列化を steering policy への一般形参照で整合させる。 |
| SC-IN-004 | R002 | なし | UC003 | U001 | B001 | 1 人の人間と複数エージェントの並行運用を契約の前提にする。 |

## 背景からの追跡

| 背景 | 追跡先 | 根拠 |
|---|---|---|
| Issue #352 | R001, R002, R003, R004 | wave 単位の並行実行契約を求める入力であるため。 |
| Discovery 20260702-parallel-execution | Ideation D001 | 候補の課題と成功状態、待機条件が 3 候補の cycle 完了で解消した経緯を確定した入力であるため。 |
| 既存 Ideation scope | SC-IN-001 から SC-IN-004 | Inception の要求境界を Ideation の採用境界から引き継ぐため。 |
| [G001](grillings/G001-contract-placement.md) | R001, R004 | wave 実行契約の定義先（公開入口 amadeus-construction）の確定判断を反映するため。 |
| #334 cycle と並行運用ポリシー | R002, R003 | worktree 分離の必要性とまとめ承認（[20260702-shared-index-generation の D003](../../20260702-shared-index-generation/construction/decisions/D003-b002-b003-task-generation-approval.md)）の観察済み実例であるため。 |

## ボルトからの追跡

| ボルト | ユニット | 要求 | 受け入れ状態 | Construction での主な成果 |
|---|---|---|---|---|
| B001 | U001 | R001, R002, R003, R004 | R001, R002, R003, R004 | amadeus-construction への wave 実行契約の定義と promote 同期。 |
| B002 | U001 | R004 | R004 | e2e mock eval の非破壊確認と skill-forge 確認の記録。 |

## 設計からの追跡

| 設計 | ユニット | 要求 | ユースケース | ボルト |
|---|---|---|---|---|
| [design.md](units/U001-bolt-wave-execution-contract/design.md) | U001 | R001, R002, R003, R004 | UC001, UC002, UC003, UC004 | B001, B002 |

## 既存コード分析からの追跡

| 分析 | 要求 | ユースケース | ユニット | ボルト | 設計 | 入力 |
|---|---|---|---|---|---|---|
| [codebase-analysis.md](codebase-analysis.md) | R001 | UC001 | U001 | B001 | [design.md](units/U001-bolt-wave-execution-contract/design.md) | `bolts.md` の依存表が必須構造として確定しており、wave をトポロジカルレベルとして導出できる。 |
| [codebase-analysis.md](codebase-analysis.md) | R002, R003 | UC002, UC003 | U001 | B001 | [design.md](units/U001-bolt-wave-execution-contract/design.md) | 並行運用ポリシー（worktree 分離、統合手順、承認運用）と #334 D003 のまとめ承認先例が契約の根拠になる。 |
| [codebase-analysis.md](codebase-analysis.md) | R004 | UC004 | U001 | B001, B002 | [design.md](units/U001-bolt-wave-execution-contract/design.md) | 直列前提の既存契約と e2e eval があり、直列既定の維持と非破壊確認が必要である。 |

## ユニットからの追跡

| ユニット | コンテキスト | 要求 | ユースケース | ボルト |
|---|---|---|---|---|
| U001 | BC001 | R001, R002, R003, R004 | UC001, UC002, UC003, UC004 | B001, B002 |

## ドメインモデルからの追跡

| 種別 | 対象 | 要求 | ユースケース | 定義元 |
|---|---|---|---|---|
| サブドメイン | SD001 自己開発運用 | R001, R002, R003, R004 | UC001, UC002, UC003, UC004 | [domain-map.md](../../../domain-map.md) |
| 境界づけられたコンテキスト | BC001 自己開発運用 | R001, R002, R003, R004 | UC001, UC002, UC003, UC004 | [domain-map.md](../../../domain-map.md) |

Inception では詳細な Domain Model を作らない。

Domain Map と Context Map は、採用済みの Bounded Context と依存関係の参照元として使う。

## 依存関係からの追跡

| 種別 | 対象 | 依存 | 理由 | 定義元 |
|---|---|---|---|---|
| 要求 | R001 | なし | wave の導出は bolts.md の既存の依存表だけを前提に定義できるため。 | [requirements.md](requirements.md) |
| 要求 | R002 | R001 | 実行と統合の手順は、wave が導出されていることが前提になるため。 | [requirements.md](requirements.md) |
| 要求 | R003 | R001 | まとめ承認は、wave 単位で準備が揃うことが前提になるため。 | [requirements.md](requirements.md) |
| 要求 | R004 | R001, R002, R003 | 直列実行との整合は、wave 契約の全体が確定した後に確認できるため。 | [requirements.md](requirements.md) |
| ユースケース | UC001 | なし | wave の導出は bolts.md の依存表だけを前提に成立するため。 | [use-cases.md](use-cases.md) |
| ユースケース | UC002 | UC001 | まとめ承認は wave 分割が導出されていることが前提になるため。 | [use-cases.md](use-cases.md) |
| ユースケース | UC003 | UC001, UC002 | 並行実行は wave 分割と承認済みの Task が前提になるため。 | [use-cases.md](use-cases.md) |
| ユースケース | UC004 | なし | 直列実行は従来どおりの既定であり、他の相互作用に依存しないため。 | [use-cases.md](use-cases.md) |
| ユニット | U001 | なし | wave の導出、実行、統合、承認は同じ実行契約を共有する単一の価値単位であるため。 | [units.md](units.md) |
| ボルト | B001 | なし | wave 契約の本文が、整合確認の前提であるため。 | [bolts.md](bolts.md) |
| ボルト | B002 | B001 | 確認対象の契約本文が前提になるため。 | [bolts.md](bolts.md) |
| 判断 | D001 | なし | Inception の所有境界を固定するため。 | [decisions.md](decisions.md) |
| 判断 | D002 | D001 | 所有境界が決まってから User Stories の要否を確定するため。 | [decisions.md](decisions.md) |
| 判断 | D003 | D001 | 所有境界が決まってから成果物の粒度例外を判断するため。 | [decisions.md](decisions.md) |
| Context Map | BC001 | なし | 採用済みまたは廃止済みのコンテキスト間依存は存在しないため。 | [context-map.md](../../../context-map.md) |

## Inception Gate

| 観点 | 状態 | 根拠 |
|---|---|---|
| 要求追跡 | passed | R001 から R004 までを use case、unit、bolt に対応付けた。 |
| 対象境界追跡 | passed | SC-IN-001 から SC-IN-004 までを要求と bolt に対応付けた。 |
| ドメイン参照 | passed | Unit の context は Domain Map の adopted Bounded Context である BC001 を参照する。 |
| 依存関係 | passed | Unit と Bolt の依存を明示し、Context Map に未登録依存がないことを確認した。 |
