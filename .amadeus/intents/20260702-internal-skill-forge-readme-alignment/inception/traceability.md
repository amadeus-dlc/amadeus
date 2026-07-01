# 追跡

## 要求からの追跡

| 要求 | アクター | ストーリー | ユースケース | ユニット | ボルト |
|---|---|---|---|---|---|
| R001 | ACT002 Agent, ACT001 Maintainer | S001, S002 | UC001, UC004 | U001 | B001, B004 |
| R002 | ACT002 Agent | S001 | UC002 | U002 | B002 |
| R003 | ACT002 Agent | S001 | UC002, UC003 | U002 | B003 |
| R004 | ACT001 Maintainer | S002 | UC001, UC004 | U001 | B001, B004 |
| R005 | ACT001 Maintainer, ACT002 Agent | S002 | UC003, UC004 | U001, U002 | B004 |

## 対象境界からの追跡

| 対象境界 | 要求 | ユーザーストーリー | ユースケース | ユニット | ボルト | 扱い |
|---|---|---|---|---|---|---|
| SC-IN-001 | R001, R005 | S001, S002 | UC001, UC004 | U001 | B001, B004 | README 分類と検証条件として扱う。 |
| SC-IN-002 | R003 | S001 | UC003 | U002 | B003 | source skill と昇格先成果物の整合確認として扱う。 |
| SC-IN-003 | R002, R005 | S001 | UC002, UC004 | U002 | B002, B004 | skill-forge 確認観点として扱う。 |
| SC-IN-004 | R001 | S001, S002 | UC001, UC004 | U001 | B001, B004 | 内部 skill を README にどう載せるかの判断として扱う。 |
| SC-IN-005 | R003, R005 | S001 | UC003, UC004 | U002 | B003, B004 | 昇格手段、検証入口、provenance の確認として扱う。 |
| SC-IN-006 | R004 | S002 | UC001, UC004 | U001 | B001, B004 | 互換性維持対象がない場合の判断として扱う。 |

## 背景からの追跡

| 目的 | アクター | 外部システム | 要求 |
|---|---|---|---|
| `amadeus-*` skill を `skill-forge` で確認し、README の公開入口説明と内部 skill の扱いをそろえる。 | ACT001 Maintainer, ACT002 Agent, ACT003 Reviewer | EXT001 GitHub | R001, R002, R003, R004, R005 |
| README だけを直して skill 契約、validator、example とのずれを残さない。 | ACT001 Maintainer, ACT003 Reviewer | EXT001 GitHub | R003, R005 |

## ボルトからの追跡

| ボルト | ユニット | 要求 |
|---|---|---|
| B001 | U001 | R001, R004 |
| B002 | U002 | R002 |
| B003 | U002 | R003 |
| B004 | U001, U002 | R001, R004, R005 |

## 設計からの追跡

| 設計 | ユニット | 要求 | ユースケース | ボルト |
|---|---|---|---|---|
| [design.md](units/U001-readme-skill-role-alignment/design.md) | U001 | R001, R004, R005 | UC001, UC004 | B001, B004 |
| [design.md](units/U002-skill-forge-review-contract/design.md) | U002 | R002, R003, R005 | UC002, UC003, UC004 | B002, B003, B004 |

## 既存コード分析からの追跡

| 分析 | 要求 | ユースケース | ユニット | ボルト | 設計 | 入力 |
|---|---|---|---|---|---|---|
| [codebase-analysis.md](codebase-analysis.md) | R001, R004 | UC001, UC004 | U001 | B001, B004 | [design.md](units/U001-readme-skill-role-alignment/design.md) | README の skill 分類、実在 skill 一覧、互換性維持対象の有無。 |
| [codebase-analysis.md](codebase-analysis.md) | R002, R003, R005 | UC002, UC003, UC004 | U002 | B002, B003, B004 | [design.md](units/U002-skill-forge-review-contract/design.md) | skill-forge 確認観点、source skill と昇格先成果物、検証入口。 |

## ユニットからの追跡

| ユニット | コンテキスト | 要求 | ユースケース | ボルト |
|---|---|---|---|---|
| U001 | BC001 | R001, R004, R005 | UC001, UC004 | B001, B004 |
| U002 | BC001 | R002, R003, R005 | UC002, UC003, UC004 | B002, B003, B004 |

## ドメインモデルからの追跡

| 種別 | 対象 | 要求 | ユースケース | 定義元 |
|---|---|---|---|---|
| サブドメイン | SD001 自己開発運用 | R001, R002, R003, R004, R005 | UC001, UC002, UC003, UC004 | [domain-map.md](../../../domain-map.md) |
| 境界づけられたコンテキスト | BC001 自己開発運用 | R001, R002, R003, R004, R005 | UC001, UC002, UC003, UC004 | [domain-map.md](../../../domain-map.md) |

## 依存関係からの追跡

| 種別 | 対象 | 依存 | 理由 | 定義元 |
|---|---|---|---|---|
| インテント | 20260702-internal-skill-forge-readme-alignment | 20260702-stage-prerequisite-checks | `amadeus-*` skill の供給元、昇格先成果物、README の公開入口説明を区別して確認する必要があるため。 | [intents.md](../../../intents.md) |
| 要求 | R001 | なし | README と実際の skill 一覧の関係が、後続確認の前提であるため。 | [requirements.md](requirements.md) |
| 要求 | R002 | R001 | skill-forge の確認範囲は、確認対象の skill 分類を前提に決めるため。 | [requirements.md](requirements.md) |
| 要求 | R003 | R001, R002 | source skill と昇格先成果物の確認対象は、README 分類と skill-forge 確認観点を前提に決めるため。 | [requirements.md](requirements.md) |
| 要求 | R004 | R001 | 互換性判断は、README の分類と公開入口の扱いを前提にするため。 | [requirements.md](requirements.md) |
| 要求 | R005 | R002, R003, R004 | README 更新後の確認条件は、skill-forge 確認、昇格先成果物、互換性判断を前提にするため。 | [requirements.md](requirements.md) |
| ユーザーストーリー | S001 | なし | Agent の入口確認価値を表すため。 | [user-stories.md](user-stories.md) |
| ユーザーストーリー | S002 | S001 | Maintainer の互換性判断は、Agent が整理した確認範囲を前提にするため。 | [user-stories.md](user-stories.md) |
| ユースケース | UC001 | なし | README と skill 一覧の棚卸しが後続確認の前提であるため。 | [use-cases.md](use-cases.md) |
| ユースケース | UC002 | UC001 | skill-forge の確認範囲は確認対象の分類を前提にするため。 | [use-cases.md](use-cases.md) |
| ユースケース | UC003 | UC001, UC002 | source と昇格先成果物の整合計画は対象分類と確認観点を前提にするため。 | [use-cases.md](use-cases.md) |
| ユースケース | UC004 | UC001, UC002, UC003 | 互換性と検証のレビューは棚卸し、確認範囲、整合計画を前提にするため。 | [use-cases.md](use-cases.md) |
| ユニット | U001 | なし | README 分類の棚卸しが skill-forge 確認範囲を決める前提であるため。 | [units.md](units.md) |
| ユニット | U002 | U001 | skill-forge 確認範囲は README の公開入口と内部 skill の分類を前提にするため。 | [units.md](units.md) |
| ボルト | B001 | なし | README と skill 一覧の棚卸しが後続確認の前提であるため。 | [bolts.md](bolts.md) |
| ボルト | B002 | B001 | skill-forge の確認範囲は確認対象の分類を前提にするため。 | [bolts.md](bolts.md) |
| ボルト | B003 | B001, B002 | source と昇格先成果物の整合確認は対象分類と確認観点を前提にするため。 | [bolts.md](bolts.md) |
| ボルト | B004 | B001, B002, B003 | 互換性判断と検証条件は棚卸し、確認範囲、整合確認を前提にするため。 | [bolts.md](bolts.md) |
| 判断 | D001 | なし | Inception の所有境界を固定するため。 | [decisions.md](decisions.md) |
| 判断 | D002 | D001 | BC001 を採用済みコンテキストとして参照するため。 | [decisions.md](decisions.md) |
| 判断 | D003 | D001, D002 | Unit と Bolt の粒度を固定するため。 | [decisions.md](decisions.md) |
