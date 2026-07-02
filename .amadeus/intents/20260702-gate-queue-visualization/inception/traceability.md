# 追跡

## 要求からの追跡

| 要求 | アクター | ストーリー | ユースケース | ユニット | ボルト |
|---|---|---|---|---|---|
| R001 | ACT001 Maintainer, ACT002 Agent | なし | UC001, UC003 | U001 | B001 |
| R002 | ACT001 Maintainer, ACT002 Agent | なし | UC001, UC002, UC003 | U001 | B001 |
| R003 | ACT001 Maintainer | なし | UC002 | U001 | B001 |
| R004 | ACT001 Maintainer, ACT002 Agent | なし | UC001, UC003 | U001 | B001, B002 |
| R005 | ACT001 Maintainer | なし | UC001, UC002 | U001 | B001 |

## 対象境界からの追跡

| 対象境界 | 要求 | ユーザーストーリー | ユースケース | ユニット | ボルト | 扱い |
|---|---|---|---|---|---|---|
| SC-IN-001 | R001, R002, R005 | なし | UC001, UC003 | U001 | B001 | 契約準拠の承認待ち判定と横断スキャンの一覧として実装する。 |
| SC-IN-002 | R003, R005 | なし | UC002 | U001 | B001 | 承認待ち 0 件時の表示を出力契約として実装する。 |
| SC-IN-003 | R004 | なし | UC001, UC003 | U001 | B001, B002 | validator 同梱の配置、手順記載、promote 同期で実現する。 |
| SC-IN-004 | R002 | なし | UC003 | U001 | B001 | 1 人の人間と複数エージェントの並行運用を一覧の利用場面の前提にする。 |

## 背景からの追跡

| 背景 | 追跡先 | 根拠 |
|---|---|---|
| Issue #350 | R001, R002, R003, R004, R005 | 承認待ちキューの可視化を求める入力であるため。 |
| Discovery 20260702-parallel-execution | Ideation D001 | 候補の課題と成功状態、待機条件が Issue #334 の cycle 完了で解消した経緯を確定した入力であるため。 |
| 既存 Ideation scope | SC-IN-001 から SC-IN-004 | Inception の要求境界を Ideation の採用境界から引き継ぐため。 |
| [G001](grillings/G001-entry-placement-and-output-format.md) | R002, R003, R004 | 実行入口の配置先と出力形式の確定判断を反映するため。 |
| Intent 20260702-phase-gate-approval-contract | R001 | 承認待ち判定が準拠するゲート語彙契約の定義元であるため。 |

## ボルトからの追跡

| ボルト | ユニット | 要求 | 受け入れ状態 | Construction での主な成果 |
|---|---|---|---|---|
| B001 | U001 | R001, R002, R003, R004, R005 | R001, R002, R003, R004, R005 | 一覧スクリプトと検証を実装する（検証先行）。 |
| B002 | U001 | R004 | R004 | 利用者向け文書へ手順を記載し、promote で同期する。 |

## 設計からの追跡

| 設計 | ユニット | 要求 | ユースケース | ボルト |
|---|---|---|---|---|
| [design.md](units/U001-approval-queue-listing-contract/design.md) | U001 | R001, R002, R003, R004, R005 | UC001, UC002, UC003 | B001, B002 |

## 既存コード分析からの追跡

| 分析 | 要求 | ユースケース | ユニット | ボルト | 設計 | 入力 |
|---|---|---|---|---|---|---|
| [codebase-analysis.md](codebase-analysis.md) | R001 | UC001 | U001 | B001 | [design.md](units/U001-approval-queue-listing-contract/design.md) | `gateResultByStatus` が承認待ち判定の定義元になり、一覧側での語彙の発明を避けられる。 |
| [codebase-analysis.md](codebase-analysis.md) | R002 | UC001, UC002 | U001 | B001 | [design.md](units/U001-approval-queue-listing-contract/design.md) | `list-unfinalized-intents.ts` の走査規約（読み飛ばし、対象外 workspace、exit code）を踏襲できる。 |
| [codebase-analysis.md](codebase-analysis.md) | R004 | UC003 | U001 | B002 | [design.md](units/U001-approval-queue-listing-contract/design.md) | `StateScaffold.ts` と `IndexGenerate.ts` の同梱配置と promote 経路を再利用できる。 |
| [codebase-analysis.md](codebase-analysis.md) | R005 | UC002 | U001 | B001 | [design.md](units/U001-approval-queue-listing-contract/design.md) | `examples/04` が承認待ち 1 件、`examples/02` と `examples/03` が 0 件の検証データになる。 |

## ユニットからの追跡

| ユニット | コンテキスト | 要求 | ユースケース | ボルト |
|---|---|---|---|---|
| U001 | BC001 | R001, R002, R003, R004, R005 | UC001, UC002, UC003 | B001, B002 |

## ドメインモデルからの追跡

| 種別 | 対象 | 要求 | ユースケース | 定義元 |
|---|---|---|---|---|
| サブドメイン | SD001 自己開発運用 | R001, R002, R003, R004, R005 | UC001, UC002, UC003 | [domain-map.md](../../../domain-map.md) |
| 境界づけられたコンテキスト | BC001 自己開発運用 | R001, R002, R003, R004, R005 | UC001, UC002, UC003 | [domain-map.md](../../../domain-map.md) |

Inception では詳細な Domain Model を作らない。

Domain Map と Context Map は、採用済みの Bounded Context と依存関係の参照元として使う。

## 依存関係からの追跡

| 種別 | 対象 | 依存 | 理由 | 定義元 |
|---|---|---|---|---|
| 要求 | R001 | なし | 判定条件は確定済みのゲート語彙契約だけを前提に定義できるため。 | [requirements.md](requirements.md) |
| 要求 | R002 | R001 | 一覧は、何を承認待ちと判定するかの条件が確定していることが前提になるため。 | [requirements.md](requirements.md) |
| 要求 | R003 | R002 | 0 件時の表示は、一覧の出力契約の一部であるため。 | [requirements.md](requirements.md) |
| 要求 | R004 | R002 | 配布と手順の記載は、実行入口の存在が前提になるため。 | [requirements.md](requirements.md) |
| 要求 | R005 | R001, R002, R003 | 検証は判定条件と一覧出力（0 件時を含む）を対象にするため。 | [requirements.md](requirements.md) |
| ユースケース | UC001 | なし | 承認待ちの一覧は他の相互作用に依存せず成立するため。 | [use-cases.md](use-cases.md) |
| ユースケース | UC002 | UC001 | 0 件時の確認は UC001 の一覧の出力契約を前提にするため。 | [use-cases.md](use-cases.md) |
| ユースケース | UC003 | UC001 | Agent の提示は UC001 と同じ一覧の実行と出力を前提にするため。 | [use-cases.md](use-cases.md) |
| ユニット | U001 | なし | スキャン、判定、出力、配布、検証は同じ一覧契約を共有する単一の価値単位であるため。 | [units.md](units.md) |
| ボルト | B001 | なし | 判定の導出規約と出力契約が、手順記載の前提であるため。 | [bolts.md](bolts.md) |
| ボルト | B002 | B001 | 手順が参照するスクリプトの名前と CLI 契約が前提になるため。 | [bolts.md](bolts.md) |
| 判断 | D001 | なし | Inception の所有境界を固定するため。 | [decisions.md](decisions.md) |
| 判断 | D002 | D001 | 所有境界が決まってから User Stories の要否を確定するため。 | [decisions.md](decisions.md) |
| 判断 | D003 | D001 | 所有境界が決まってから成果物の粒度例外を判断するため。 | [decisions.md](decisions.md) |
| Context Map | BC001 | なし | 採用済みまたは廃止済みのコンテキスト間依存は存在しないため。 | [context-map.md](../../../context-map.md) |

## Inception Gate

| 観点 | 状態 | 根拠 |
|---|---|---|
| 要求追跡 | passed | R001 から R005 までを use case、unit、bolt に対応付けた。 |
| 対象境界追跡 | passed | SC-IN-001 から SC-IN-004 までを要求と bolt に対応付けた。 |
| ドメイン参照 | passed | Unit の context は Domain Map の adopted Bounded Context である BC001 を参照する。 |
| 依存関係 | passed | Unit と Bolt の依存を明示し、Context Map に未登録依存がないことを確認した。 |
