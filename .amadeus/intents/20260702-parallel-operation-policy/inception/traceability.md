# 追跡

## 要求からの追跡

| 要求 | アクター | ストーリー | ユースケース | ユニット | ボルト |
|---|---|---|---|---|---|
| R001 | ACT001 Maintainer, ACT002 Agent | なし | UC001 | U001 | B001 |
| R002 | ACT002 Agent | なし | UC002 | U001 | B001 |
| R003 | ACT001 Maintainer | なし | UC003 | U001 | B001 |
| R004 | ACT001 Maintainer, ACT002 Agent | なし | UC001 | U001 | B001 |
| R005 | ACT002 Agent | なし | UC004 | U001 | B001, B002 |

## 対象境界からの追跡

| 対象境界 | 要求 | ユーザーストーリー | ユースケース | ユニット | ボルト | 扱い |
|---|---|---|---|---|---|---|
| SC-IN-001 | R001, R002, R003, R004 | なし | UC001, UC002, UC003 | U001 | B001 | 並行可否、統合手順、承認運用、直列化を policy の判断基準として記録する。 |
| SC-IN-002 | R001, R002, R003, R004, R005 | なし | UC001, UC002, UC003, UC004 | U001 | B001, B002 | policy を根拠に並行作業を進められる状態を索引登録と責務分担で成立させる。 |
| SC-IN-003 | R001, R002, R003, R004 | なし | UC001, UC002, UC003 | U001 | B001 | 観察した実例への参照リンクを各判断基準の根拠として記録する。 |
| SC-IN-004 | R005 | なし | UC004 | U001 | B001, B002 | 既存 Git Branching Policy との責務分担を相互参照で明記する。 |
| SC-IN-005 | R001, R004 | なし | UC001 | U001 | B001 | 1 人の人間と複数エージェントの並行運用を判断基準の前提にする。 |

## 背景からの追跡

| 背景 | 追跡先 | 根拠 |
|---|---|---|
| Issue #351 | R001, R002, R003, R004, R005 | 並行運用の判断基準の policy 化を求める入力であるため。 |
| Discovery 20260702-parallel-execution | Ideation D001 | 候補の課題と成功状態、待機条件が Issue #334 の cycle 完了で解消した経緯を確定した入力であるため。 |
| 既存 Ideation scope | SC-IN-001 から SC-IN-005 | Inception の要求境界を Ideation の採用境界から引き継ぐため。 |
| [G001](grillings/G001-policy-placement.md) | R005 | policy の配置先の確定判断を反映するため。 |
| #334 と #350 の cycle 成果物 | R001, R002, R003, R004 | 判断基準の根拠になる観察済みの実例であるため。 |

## ボルトからの追跡

| ボルト | ユニット | 要求 | 受け入れ状態 | Construction での主な成果 |
|---|---|---|---|---|
| B001 | U001 | R001, R002, R003, R004, R005 | R001, R002, R003, R004, R005 | parallel-operation.md 本文の作成と索引登録。 |
| B002 | U001 | R005 | R005 | git-branching.md への責務分担の相互参照追記。 |

## 設計からの追跡

| 設計 | ユニット | 要求 | ユースケース | ボルト |
|---|---|---|---|---|
| [design.md](units/U001-parallel-operation-policy-contract/design.md) | U001 | R001, R002, R003, R004, R005 | UC001, UC002, UC003, UC004 | B001, B002 |

## 既存コード分析からの追跡

| 分析 | 要求 | ユースケース | ユニット | ボルト | 設計 | 入力 |
|---|---|---|---|---|---|---|
| [codebase-analysis.md](codebase-analysis.md) | R005 | UC004 | U001 | B001, B002 | [design.md](units/U001-parallel-operation-policy-contract/design.md) | 既存 policy の記録構造（索引、README、責務分担見出し）を踏襲でき、git-branching.md の網羅範囲から責務境界を導出できる。 |
| [codebase-analysis.md](codebase-analysis.md) | R001, R002, R003, R004 | UC001, UC002, UC003 | U001 | B001 | [design.md](units/U001-parallel-operation-policy-contract/design.md) | #334 と #350 の Intent 成果物が観察済みの実例として根拠リンクの対象になる。GateQueueList.ts と IndexGenerate.ts が判断基準の実行入口として参照できる。 |

## ユニットからの追跡

| ユニット | コンテキスト | 要求 | ユースケース | ボルト |
|---|---|---|---|---|
| U001 | BC001 | R001, R002, R003, R004, R005 | UC001, UC002, UC003, UC004 | B001, B002 |

## ドメインモデルからの追跡

| 種別 | 対象 | 要求 | ユースケース | 定義元 |
|---|---|---|---|---|
| サブドメイン | SD001 自己開発運用 | R001, R002, R003, R004, R005 | UC001, UC002, UC003, UC004 | [domain-map.md](../../../domain-map.md) |
| 境界づけられたコンテキスト | BC001 自己開発運用 | R001, R002, R003, R004, R005 | UC001, UC002, UC003, UC004 | [domain-map.md](../../../domain-map.md) |

Inception では詳細な Domain Model を作らない。

Domain Map と Context Map は、採用済みの Bounded Context と依存関係の参照元として使う。

## 依存関係からの追跡

| 種別 | 対象 | 依存 | 理由 | 定義元 |
|---|---|---|---|---|
| 要求 | R001 | なし | 並行可否の判断基準は他の要求に依存せず定義できるため。 | [requirements.md](requirements.md) |
| 要求 | R002 | なし | 統合手順は観察済みの実例だけを前提に定義できるため。 | [requirements.md](requirements.md) |
| 要求 | R003 | なし | 承認運用は確定済みのゲート契約と実行入口だけを前提に定義できるため。 | [requirements.md](requirements.md) |
| 要求 | R004 | なし | 直列化の基準は観察済みの実例だけを前提に定義できるため。 | [requirements.md](requirements.md) |
| 要求 | R005 | R001, R002, R003, R004 | 索引登録と責務分担の記述は、policy 本文の判断基準が揃っていることが前提になるため。 | [requirements.md](requirements.md) |
| ユースケース | UC001 | UC004 | 並行可否の判断は、policy を索引から見つけて参照できることが前提になるため。 | [use-cases.md](use-cases.md) |
| ユースケース | UC002 | UC004 | 統合手順の実行は、policy を参照できることが前提になるため。 | [use-cases.md](use-cases.md) |
| ユースケース | UC003 | UC004 | 承認キューの運用は、policy を参照できることが前提になるため。 | [use-cases.md](use-cases.md) |
| ユースケース | UC004 | なし | policy の参照は他の相互作用に依存せず成立するため。 | [use-cases.md](use-cases.md) |
| ユニット | U001 | なし | 並行可否、統合手順、承認運用、直列化の判断基準は相互に依存し、同じ policy 契約を共有する単一の価値単位であるため。 | [units.md](units.md) |
| ボルト | B001 | なし | policy 本文と索引が、相互参照の前提であるため。 | [bolts.md](bolts.md) |
| ボルト | B002 | B001 | 相互参照が指す policy 本文の見出しが前提になるため。 | [bolts.md](bolts.md) |
| 判断 | D001 | なし | Inception の所有境界を固定するため。 | [decisions.md](decisions.md) |
| 判断 | D002 | D001 | 所有境界が決まってから User Stories の要否を確定するため。 | [decisions.md](decisions.md) |
| 判断 | D003 | D001 | 所有境界が決まってから成果物の粒度例外を判断するため。 | [decisions.md](decisions.md) |
| Context Map | BC001 | なし | 採用済みまたは廃止済みのコンテキスト間依存は存在しないため。 | [context-map.md](../../../context-map.md) |

## Inception Gate

| 観点 | 状態 | 根拠 |
|---|---|---|
| 要求追跡 | passed | R001 から R005 までを use case、unit、bolt に対応付けた。 |
| 対象境界追跡 | passed | SC-IN-001 から SC-IN-005 までを要求と bolt に対応付けた。 |
| ドメイン参照 | passed | Unit の context は Domain Map の adopted Bounded Context である BC001 を参照する。 |
| 依存関係 | passed | Unit と Bolt の依存を明示し、Context Map に未登録依存がないことを確認した。 |
