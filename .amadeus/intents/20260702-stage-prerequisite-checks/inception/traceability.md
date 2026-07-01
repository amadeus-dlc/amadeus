# 追跡

## 要求からの追跡

| 要求 | アクター | ストーリー | ユースケース | ユニット | ボルト |
|---|---|---|---|---|---|
| R001 | ACT002 Agent | なし | UC001 | U001 | B001, B002 |
| R002 | ACT002 Agent, ACT001 Maintainer | なし | UC001 | U001 | B001, B002 |
| R003 | ACT002 Agent | なし | UC001 | U001 | B001, B002 |
| R004 | ACT002 Agent | なし | UC002 | U002 | B003 |
| R005 | ACT002 Agent, ACT001 Maintainer | なし | UC003 | U002 | B003 |

## 対象境界からの追跡

| 対象境界 | 要求 | ユーザーストーリー | ユースケース | ユニット | ボルト | 扱い |
|---|---|---|---|---|---|---|
| SC-IN-001 | R001 | なし | UC001 | U001 | B001, B002 | skill 供給元と実行環境の状態を入力証拠として扱う。 |
| SC-IN-002 | R001 | なし | UC001 | U001 | B001, B002 | source skill、昇格先成果物、host environment を区別する。 |
| SC-IN-003 | R002 | なし | UC001 | U001 | B001, B002 | stage0、stage1、stage2、stage0 採用判断を前提確認として扱う。 |
| SC-IN-004 | R003 | なし | UC001 | U001 | B001, B002 | decision review と Skill Contract へ接続する。 |
| SC-IN-005 | R004 | なし | UC002 | U002 | B003 | 前提不成立を分類する。 |
| SC-IN-006 | R005 | なし | UC003 | U002 | B003 | Issue #277 と Issue #272 の関係を repo 内代表例として扱う。 |
| SC-IN-007 | R005 | なし | UC003 | U002 | B003 | 配布対象 skill に repo 内 Issue 番号前提の説明を混ぜない。 |

## 背景からの追跡

| 背景 | 追跡先 | 根拠 |
|---|---|---|
| Issue #278 | R001, R002, R003, R004, R005 | phase skill 起動時の skill 供給元と stage 前提確認を求める入力であるため。 |
| Issue #277 | R005 | 内部 skill 候補の不足を補修した代表例であるため。 |
| Issue #272 | R005 | 前提にした内部 skill が存在しない問題の代表例であるため。 |
| Issue #259 | R004 | learning review と後続 Issue 候補の分類に関係するため。 |
| 既存 Ideation scope | SC-IN-001 から SC-IN-007 | Inception の要求境界を Ideation の採用境界から引き継ぐため。 |
| `20260701-decision-review-grilling-gate` | R003, R004 | decision review の入力証拠と分岐分類を参照するため。 |
| `20260701-skill-contract-catalog` | R003 | Skill Contract の入力証拠と生成確認を参照するため。 |
| `20260701-self-development-cycle-stage-workspace` | R002 | stage0、stage1、stage2、stage0 採用判断を参照するため。 |

## ボルトからの追跡

| ボルト | ユニット | 要求 | 受け入れ状態 | Construction での主な成果 |
|---|---|---|---|---|
| B001 | U001 | R001, R002, R003 | R001, R002, R003 | `amadeus-decision-review` に stage 前提確認の入力証拠と判断ノードを追加する。 |
| B002 | U001 | R001, R002, R003 | R001, R002, R003 | Skill Contract と phase skill 起動時説明を stage 前提確認へ整合させる。 |
| B003 | U002 | R004, R005 | R004, R005 | 前提不成立分類と repo 内代表例の説明境界を確定する。 |

## 設計からの追跡

| 設計 | ユニット | 要求 | ユースケース | ボルト |
|---|---|---|---|---|
| [design.md](units/U001-stage-prerequisite-evidence/design.md) | U001 | R001, R002, R003 | UC001 | B001, B002 |
| [design.md](units/U002-prerequisite-failure-routing/design.md) | U002 | R004, R005 | UC002, UC003 | B003 |

## 既存コード分析からの追跡

| 分析 | 要求 | ユースケース | ユニット | ボルト | 設計 | 入力 |
|---|---|---|---|---|---|---|
| [codebase-analysis.md](codebase-analysis.md) | R001 | UC001 | U001 | B001, B002 | [design.md](units/U001-stage-prerequisite-evidence/design.md) | source skill、昇格先成果物、host environment の区別が必要である。 |
| [codebase-analysis.md](codebase-analysis.md) | R002 | UC001 | U001 | B001, B002 | [design.md](units/U001-stage-prerequisite-evidence/design.md) | stage0、stage1、stage2、stage0 採用判断を前提確認として扱う必要がある。 |
| [codebase-analysis.md](codebase-analysis.md) | R003 | UC001 | U001 | B001, B002 | [design.md](units/U001-stage-prerequisite-evidence/design.md) | decision review と Skill Contract の両方に接続する必要がある。 |
| [codebase-analysis.md](codebase-analysis.md) | R004 | UC002 | U002 | B003 | [design.md](units/U002-prerequisite-failure-routing/design.md) | 前提不成立を分類語彙に落とす必要がある。 |
| [codebase-analysis.md](codebase-analysis.md) | R005 | UC003 | U002 | B003 | [design.md](units/U002-prerequisite-failure-routing/design.md) | repo 内代表例と配布対象 skill の一般説明を分ける必要がある。 |

## ユニットからの追跡

| ユニット | コンテキスト | 要求 | ユースケース | ボルト |
|---|---|---|---|---|
| U001 | BC001 | R001, R002, R003 | UC001 | B001, B002 |
| U002 | BC001 | R004, R005 | UC002, UC003 | B003 |

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
| 要求 | R001 | なし | skill 供給元と実行環境の状態を区別できなければ、stage 前提を判断できないため。 | [requirements.md](requirements.md) |
| 要求 | R002 | R001 | stage 前提確認は、どの skill と実行環境を確認しているかを前提にするため。 | [requirements.md](requirements.md) |
| 要求 | R003 | R001, R002 | decision review と Skill Contract の配置は、入力証拠と stage 前提確認の内容を前提にするため。 | [requirements.md](requirements.md) |
| 要求 | R004 | R002, R003 | 前提不成立の分類は、stage 前提確認と配置先の判断結果を入力にするため。 | [requirements.md](requirements.md) |
| 要求 | R005 | R003, R004 | repo 内代表例の扱いは、配置先と分類先を決めた後で一般説明へ分離するため。 | [requirements.md](requirements.md) |
| ユースケース | UC001 | なし | phase skill 起動時の前提確認が後続分類の前提であるため。 | [use-cases.md](use-cases.md) |
| ユースケース | UC002 | UC001 | 前提不成立の分類は、起動時確認の結果を入力にするため。 | [use-cases.md](use-cases.md) |
| ユースケース | UC003 | UC001, UC002 | 代表例の扱いは、前提確認と分類先が決まってから配布対象 skill の説明へ分離するため。 | [use-cases.md](use-cases.md) |
| ユニット | U001 | なし | 前提確認の入力証拠が、分類と代表例境界の前提であるため。 | [units.md](units.md) |
| ユニット | U002 | U001 | 前提不成立分類と説明境界は、stage 前提確認の結果を入力にするため。 | [units.md](units.md) |
| ボルト | B001 | なし | decision review の判断材料が、Skill Contract と phase skill 反映の前提であるため。 | [bolts.md](bolts.md) |
| ボルト | B002 | B001 | Skill Contract と phase skill は、decision review の確認順序を参照するため。 | [bolts.md](bolts.md) |
| ボルト | B003 | B001, B002 | 前提不成立分類と説明境界は、stage 前提確認の配置先が決まってから確定するため。 | [bolts.md](bolts.md) |
| 判断 | D001 | なし | Inception の所有境界を固定するため。 | [decisions.md](decisions.md) |
| 判断 | D002 | D001 | BC001 を参照して Unit のコンテキストを確定するため。 | [decisions.md](decisions.md) |
| 判断 | D003 | D001 | User Stories の要否は Inception の成果物境界に関わるため。 | [decisions.md](decisions.md) |
| 判断 | D004 | D001, D002, D003 | Unit と Bolt の粒度を固定するため。 | [decisions.md](decisions.md) |
| Context Map | BC001 | なし | 採用済みまたは廃止済みのコンテキスト間依存は存在しないため。 | [context-map.md](../../../context-map.md) |

## Inception Gate

| 観点 | 状態 | 根拠 |
|---|---|---|
| 要求追跡 | passed | R001 から R005 までを use case、unit、bolt に対応付けた。 |
| 対象境界追跡 | passed | SC-IN-001 から SC-IN-007 までを要求と bolt に対応付けた。 |
| ドメイン参照 | passed | Unit の context は Domain Map の adopted Bounded Context である BC001 を参照する。 |
| 依存関係 | passed | Unit と Bolt の依存を明示し、Context Map に未登録依存がないことを確認した。 |
