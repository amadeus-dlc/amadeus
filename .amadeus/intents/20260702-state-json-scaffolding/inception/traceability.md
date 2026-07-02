# 追跡

## 要求からの追跡

| 要求 | アクター | ストーリー | ユースケース | ユニット | ボルト |
|---|---|---|---|---|---|
| R001 | ACT002 Agent | なし | UC001, UC002 | U001 | B001 |
| R002 | ACT002 Agent | なし | UC001 | U001 | B001 |
| R003 | ACT002 Agent | なし | UC001 | U001 | B001 |
| R004 | ACT002 Agent | なし | UC003 | U001 | B002 |
| R005 | ACT002 Agent | なし | UC002 | U001 | B001 |
| R006 | ACT002 Agent | なし | UC003 | U001 | B002 |

## 対象境界からの追跡

| 対象境界 | 要求 | ユーザーストーリー | ユースケース | ユニット | ボルト | 扱い |
|---|---|---|---|---|---|---|
| SC-IN-001 | R001, R002 | なし | UC001, UC002 | U001 | B001 | 遷移単位の雛形生成と既存値保持をスクリプトの契約として実装する。 |
| SC-IN-002 | R003 | なし | UC001 | U001 | B001 | amadeus-validator の同梱スクリプトとして配置し、配布先で実行できるようにする。 |
| SC-IN-003 | R004 | なし | UC003 | U001 | B002 | phase skill の該当手順へ利用参照を追加する。 |
| SC-IN-004 | R005 | なし | UC002 | U001 | B001 | 失敗する eval を先行追加し、RED を確認してから実装する。 |
| SC-IN-005 | R006 | なし | UC003 | U001 | B002 | source と昇格先を promote 手順で同期する。 |

## 背景からの追跡

| 背景 | 追跡先 | 根拠 |
|---|---|---|
| Issue #311 | R001, R002, R003, R004, R005, R006 | phase 遷移の state.json 雛形生成を求める入力であるため。 |
| Issue #314 | Ideation D001 | 親 Issue として Discovery の候補判断（依存順）を確定した入力であるため。 |
| 既存 Ideation scope | SC-IN-001 から SC-IN-005 | Inception の要求境界を Ideation の採用境界から引き継ぐため。 |
| [G001](grillings/G001-script-placement.md) | R003 | 配置先を amadeus-validator の共有 1 箇所とする確定判断を反映するため。 |
| 直近 cycle の観察 | R001, R002 | Intent 20260702-phase-gate-approval-contract の Construction 開始時に必須配列の手書き漏れが validator 指摘になった観察を根拠にするため。 |

## ボルトからの追跡

| ボルト | ユニット | 要求 | 受け入れ状態 | Construction での主な成果 |
|---|---|---|---|---|
| B001 | U001 | R001, R002, R003, R005 | R001, R002, R003, R005 | 雛形生成スクリプトと eval を実装する（eval 先行）。 |
| B002 | U001 | R004, R006 | R004, R006 | phase skill の手順へ参照を追加し、promote で同期する。 |

## 設計からの追跡

| 設計 | ユニット | 要求 | ユースケース | ボルト |
|---|---|---|---|---|
| [design.md](units/U001-state-scaffold-contract/design.md) | U001 | R001, R002, R003, R004, R005, R006 | UC001, UC002, UC003 | B001, B002 |

## 既存コード分析からの追跡

| 分析 | 要求 | ユースケース | ユニット | ボルト | 設計 | 入力 |
|---|---|---|---|---|---|---|
| [codebase-analysis.md](codebase-analysis.md) | R001, R002 | UC001, UC002 | U001 | B001 | [design.md](units/U001-state-scaffold-contract/design.md) | 生成済み契約と 18 Intent 分の実データが雛形の正解データとして使える。 |
| [codebase-analysis.md](codebase-analysis.md) | R003 | UC001 | U001 | B001 | [design.md](units/U001-state-scaffold-contract/design.md) | scripts/ は昇格対象であり、同じ skill 内なら generated/** を実行時に再利用できる。 |
| [codebase-analysis.md](codebase-analysis.md) | R004 | UC003 | U001 | B002 | [design.md](units/U001-state-scaffold-contract/design.md) | state 更新手順の記述位置が 5 つの skill に特定されている。 |
| [codebase-analysis.md](codebase-analysis.md) | R005, R006 | UC002, UC003 | U001 | B001, B002 | [design.md](units/U001-state-scaffold-contract/design.md) | evals/ は昇格除外であり、promote 契約は Issue #309 の分析と同一である。 |

## ユニットからの追跡

| ユニット | コンテキスト | 要求 | ユースケース | ボルト |
|---|---|---|---|---|
| U001 | BC001 | R001, R002, R003, R004, R005, R006 | UC001, UC002, UC003 | B001, B002 |

## ドメインモデルからの追跡

| 種別 | 対象 | 要求 | ユースケース | 定義元 |
|---|---|---|---|---|
| サブドメイン | SD001 自己開発運用 | R001, R002, R003, R004, R005, R006 | UC001, UC002, UC003 | [domain-map.md](../../../domain-map.md) |
| 境界づけられたコンテキスト | BC001 自己開発運用 | R001, R002, R003, R004, R005, R006 | UC001, UC002, UC003 | [domain-map.md](../../../domain-map.md) |

Inception では詳細な Domain Model を作らない。

Domain Map と Context Map は、採用済みの Bounded Context と依存関係の参照元として使う。

## 依存関係からの追跡

| 種別 | 対象 | 依存 | 理由 | 定義元 |
|---|---|---|---|---|
| 要求 | R001 | なし | 遷移単位の生成契約は他の要求に依存せず定義できるため。 | [requirements.md](requirements.md) |
| 要求 | R002 | R001 | 保持規則は R001 の生成、更新の動作に対する制約であるため。 | [requirements.md](requirements.md) |
| 要求 | R003 | なし | 配置と配布の制約は他の要求に依存せず定義できるため。 | [requirements.md](requirements.md) |
| 要求 | R004 | R001, R003 | 手順が参照するスクリプトの実在と配置が前提になるため。 | [requirements.md](requirements.md) |
| 要求 | R005 | R001 | eval は R001 の生成契約を検証対象にするため。 | [requirements.md](requirements.md) |
| 要求 | R006 | R003, R004 | 昇格同期は、配置したスクリプトと手順変更を対象にするため。 | [requirements.md](requirements.md) |
| ユースケース | UC001 | なし | 雛形の生成、更新は他の相互作用に依存せず成立するため。 | [use-cases.md](use-cases.md) |
| ユースケース | UC002 | UC001 | 検証対象の state は UC001 の生成、更新で作られるため。 | [use-cases.md](use-cases.md) |
| ユースケース | UC003 | UC001 | 手順が参照するスクリプトの動作は UC001 で定義されるため。 | [use-cases.md](use-cases.md) |
| ユニット | U001 | なし | 雛形の生成契約、配置、手順参照、検証を単一の価値単位として扱うため。 | [units.md](units.md) |
| ボルト | B001 | なし | スクリプトの存在と契約が、手順からの参照の前提であるため。 | [bolts.md](bolts.md) |
| ボルト | B002 | B001 | 手順の参照は、スクリプトの path と引数体系を参照するため。 | [bolts.md](bolts.md) |
| 判断 | D001 | なし | Inception の所有境界を固定するため。 | [decisions.md](decisions.md) |
| 判断 | D002 | D001 | 所有境界が決まってから Unit のコンテキスト参照を確定するため。 | [decisions.md](decisions.md) |
| 判断 | D003 | D001 | 所有境界が決まってから成果物の粒度例外を判断するため。 | [decisions.md](decisions.md) |
| Context Map | BC001 | なし | 採用済みまたは廃止済みのコンテキスト間依存は存在しないため。 | [context-map.md](../../../context-map.md) |

## Inception Gate

| 観点 | 状態 | 根拠 |
|---|---|---|
| 要求追跡 | passed | R001 から R006 までを use case、unit、bolt に対応付けた。 |
| 対象境界追跡 | passed | SC-IN-001 から SC-IN-005 までを要求と bolt に対応付けた。 |
| ドメイン参照 | passed | Unit の context は Domain Map の adopted Bounded Context である BC001 を参照する。 |
| 依存関係 | passed | Unit と Bolt の依存を明示し、Context Map に未登録依存がないことを確認した。 |
