# 追跡

## 要求からの追跡

| 要求 | アクター | ストーリー | ユースケース | ユニット | ボルト |
|---|---|---|---|---|---|
| R001 | ACT002 Agent, ACT001 Maintainer | なし | UC001, UC002 | U001 | B001 |
| R002 | ACT002 Agent | なし | UC003 | U001 | B002 |
| R003 | ACT002 Agent | なし | UC004 | U001 | B002 |
| R004 | ACT002 Agent | なし | UC005 | U002 | B003 |
| R005 | ACT002 Agent | なし | UC005 | U001, U002 | B001, B002, B003 |

## 対象境界からの追跡

| 対象境界 | 要求 | ユーザーストーリー | ユースケース | ユニット | ボルト | 扱い |
|---|---|---|---|---|---|---|
| SC-IN-001 | R001 | なし | UC002 | U001 | B001 | implementation-execution の前提を `passed` だけに変更する。 |
| SC-IN-002 | R001 | なし | UC001 | U001 | B001 | bolt-preparation に停止と承認待ちの行動を肯定形で明記する。 |
| SC-IN-003 | R002 | なし | UC003 | U001 | B002 | 文言規約による決定論的トリガーを 3 つの phase skill に定義する。 |
| SC-IN-004 | R003 | なし | UC004 | U001 | B002 | scaffold-only の許可条件を確定判断の記録 3 種の実在に限定する。 |
| SC-IN-005 | R004 | なし | UC005 | U002 | B003 | validator に approval evidence の実在検査を追加する。 |
| SC-IN-006 | R004 | なし | UC005 | U002 | B003 | eval の改変ケースを先行追加し、RED を確認してから実装する。 |
| SC-IN-007 | R005 | なし | UC005 | U001, U002 | B001, B002, B003 | source と昇格先を promote 手順で同期する。 |

## 背景からの追跡

| 背景 | 追跡先 | 根拠 |
|---|---|---|
| Issue #306 | R001, R002, R003 | 人間ゲートと grilling 起動の決定論化を求める入力であるため。 |
| Issue #307 | R004 | 承認 evidence の validator 検査を求める入力であるため。 |
| Issue #314 | Ideation D002 | 親 Issue として #306 と #307 を同じゲート契約の両面と整理した入力であるため。 |
| 既存 Ideation scope | SC-IN-001 から SC-IN-007 | Inception の要求境界を Ideation の採用境界から引き継ぐため。 |
| [G001](grillings/G001-trigger-and-scaffold-conditions.md) | R002, R003 | トリガーの判定形式と scaffold-only の許可条件の確定判断を反映するため。 |
| Ideation D002 | R001, R002, R003, R004 | #306 と #307 を 1 Intent に統合した判断が要求の範囲を確定するため。 |

## ボルトからの追跡

| ボルト | ユニット | 要求 | 受け入れ状態 | Construction での主な成果 |
|---|---|---|---|---|
| B001 | U001 | R001, R005 | R001, R005 | implementation-execution と bolt-preparation の契約を変更し、promote で同期する。 |
| B002 | U001 | R002, R003, R005 | R002, R003, R005 | 3 つの phase skill のトリガーと scaffold-only 条件を変更し、promote で同期する。 |
| B003 | U002 | R004, R005 | R004, R005 | eval を先行追加（RED）し、validator の検査を実装（GREEN）し、promote で同期する。 |

## 設計からの追跡

| 設計 | ユニット | 要求 | ユースケース | ボルト |
|---|---|---|---|---|
| [design.md](units/U001-phase-gate-skill-contract/design.md) | U001 | R001, R002, R003, R005 | UC001, UC002, UC003, UC004 | B001, B002 |
| [design.md](units/U002-approval-evidence-validation/design.md) | U002 | R004, R005 | UC005 | B003 |

## 既存コード分析からの追跡

| 分析 | 要求 | ユースケース | ユニット | ボルト | 設計 | 入力 |
|---|---|---|---|---|---|---|
| [codebase-analysis.md](codebase-analysis.md) | R001 | UC001, UC002 | U001 | B001 | [design.md](units/U001-phase-gate-skill-contract/design.md) | implementation-execution の前提行と bolt-preparation の手順 11、12 に迂回路が特定されている。 |
| [codebase-analysis.md](codebase-analysis.md) | R002 | UC003 | U001 | B002 | [design.md](units/U001-phase-gate-skill-contract/design.md) | 3 つの phase skill の Decision Review 記述は同じ構造を持ち、未確定事項の文言慣行が既に成立している。 |
| [codebase-analysis.md](codebase-analysis.md) | R003 | UC004 | U001 | B002 | [design.md](units/U001-phase-gate-skill-contract/design.md) | auto 判定表の scaffold-only 行の条件を置き換えられる。 |
| [codebase-analysis.md](codebase-analysis.md) | R004 | UC005 | U002 | B003 | [design.md](units/U002-approval-evidence-validation/design.md) | validator は evidence 配列を既に解釈しており、既存の `passed` 34 件はすべて approval を持つ。 |
| [codebase-analysis.md](codebase-analysis.md) | R005 | UC005 | U001, U002 | B001, B002, B003 | [design.md](units/U001-phase-gate-skill-contract/design.md), [design.md](units/U002-approval-evidence-validation/design.md) | source と昇格先の md5 一致を確認済みで、eval の実行入口は `test:it:amadeus-validator` である。 |

## ユニットからの追跡

| ユニット | コンテキスト | 要求 | ユースケース | ボルト |
|---|---|---|---|---|
| U001 | BC001 | R001, R002, R003, R005 | UC001, UC002, UC003, UC004 | B001, B002 |
| U002 | BC001 | R004, R005 | UC005 | B003 |

## ドメインモデルからの追跡

| 種別 | 対象 | 要求 | ユースケース | 定義元 |
|---|---|---|---|---|
| サブドメイン | SD001 自己開発運用 | R001, R002, R003, R004, R005 | UC001, UC002, UC003, UC004, UC005 | [domain-map.md](../../../domain-map.md) |
| 境界づけられたコンテキスト | BC001 自己開発運用 | R001, R002, R003, R004, R005 | UC001, UC002, UC003, UC004, UC005 | [domain-map.md](../../../domain-map.md) |

Inception では詳細な Domain Model を作らない。

Domain Map と Context Map は、採用済みの Bounded Context と依存関係の参照元として使う。

## 依存関係からの追跡

| 種別 | 対象 | 依存 | 理由 | 定義元 |
|---|---|---|---|---|
| 要求 | R001 | なし | 実装ゲートの契約は他の要求に依存せず定義できるため。 | [requirements.md](requirements.md) |
| 要求 | R002 | なし | grilling 起動の判定規則は他の要求に依存せず定義できるため。 | [requirements.md](requirements.md) |
| 要求 | R003 | なし | scaffold-only の許可条件は他の要求に依存せず定義できるため。 | [requirements.md](requirements.md) |
| 要求 | R004 | R001 | 検査対象の approval evidence は R001 の契約で追加されるため。 | [requirements.md](requirements.md) |
| 要求 | R005 | R001, R002, R003, R004 | 昇格同期は R001 から R004 の変更を対象にするため。 | [requirements.md](requirements.md) |
| ユースケース | UC001 | なし | 停止と承認は他の相互作用に依存せず成立するため。 | [use-cases.md](use-cases.md) |
| ユースケース | UC002 | UC001 | 実装ゲートが読む `passed` は UC001 の承認で作られるため。 | [use-cases.md](use-cases.md) |
| ユースケース | UC003 | なし | grilling 起動の判定は前段成果物だけを入力にするため。 | [use-cases.md](use-cases.md) |
| ユースケース | UC004 | なし | scaffold-only の許可判定は入力の確定判断の記録だけを入力にするため。 | [use-cases.md](use-cases.md) |
| ユースケース | UC005 | UC001 | 検査対象の approval evidence は UC001 の承認で追加されるため。 | [use-cases.md](use-cases.md) |
| ユニット | U001 | なし | ゲート契約の定義は他の Unit に依存せず成立するため。 | [units.md](units.md) |
| ユニット | U002 | U001 | 検査対象の承認手順は U001 の契約で確定するため。 | [units.md](units.md) |
| ボルト | B001 | なし | 実装ゲートの契約変更は他の Bolt に依存せず実施できるため。 | [bolts.md](bolts.md) |
| ボルト | B002 | B001 | 同じ skill 群への変更が重なるため、実装ゲートの契約文言を確定させてから重ねるため。 | [bolts.md](bolts.md) |
| ボルト | B003 | B001 | 検査が要求する approval evidence の追加手順は B001 の契約文言で確定するため。 | [bolts.md](bolts.md) |
| 判断 | D001 | なし | Inception の所有境界を固定するため。 | [decisions.md](decisions.md) |
| 判断 | D002 | D001 | 所有境界が決まってから Unit のコンテキスト参照を確定するため。 | [decisions.md](decisions.md) |
| 判断 | D003 | D001 | 所有境界が決まってから成果物の粒度例外を判断するため。 | [decisions.md](decisions.md) |
| Context Map | BC001 | なし | 採用済みまたは廃止済みのコンテキスト間依存は存在しないため。 | [context-map.md](../../../context-map.md) |

## Inception Gate

| 観点 | 状態 | 根拠 |
|---|---|---|
| 要求追跡 | passed | R001 から R005 までを use case、unit、bolt に対応付けた。 |
| 対象境界追跡 | passed | SC-IN-001 から SC-IN-007 までを要求と bolt に対応付けた。 |
| ドメイン参照 | passed | Unit の context は Domain Map の adopted Bounded Context である BC001 を参照する。 |
| 依存関係 | passed | Unit と Bolt の依存を明示し、Context Map に未登録依存がないことを確認した。 |
