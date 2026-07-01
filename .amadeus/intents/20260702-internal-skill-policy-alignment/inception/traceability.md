# 追跡

## 要求からの追跡

| 要求 | アクター | ストーリー | ユースケース | ユニット | ボルト |
|---|---|---|---|---|---|
| R001 | ACT002 Agent | S001, S002 | UC001 | U001 | B001 |
| R002 | ACT001 Maintainer | S001, S002 | UC001, UC002 | U001 | B001 |
| R003 | ACT002 Agent | S002 | UC003 | U001 | B002 |
| R004 | ACT002 Agent | S002, S003 | UC003, UC004 | U001 | B002 |
| R005 | ACT003 Reviewer | S001, S003 | UC002, UC004 | U001 | B003 |

## 対象境界からの追跡

| 対象境界 | 要求 | ユーザーストーリー | ユースケース | ユニット | ボルト | 扱い |
|---|---|---|---|---|---|---|
| SC-IN-001 | R001 | S001, S002 | UC001 | U001 | B001 | README の Internal Skills 一覧として扱う。 |
| SC-IN-002 | R002 | S001, S002 | UC001, UC002 | U001 | B001 | 内部 skill 判定として扱う。 |
| SC-IN-003 | R003 | S002 | UC003 | U001 | B002 | 暗黙起動ポリシー設定対象として扱う。 |
| SC-IN-004 | R004 | S002, S003 | UC003, UC004 | U001 | B002 | Codex と Claude Code の設定配置確認として扱う。 |
| SC-OUT-001 | R005 | S001, S003 | UC002, UC004 | U001 | B003 | `skill-forge` 内容監査を対象外制約として扱う。 |
| SC-OUT-002 | R005 | S001, S003 | UC002, UC004 | U001 | B003 | `SKILL.md` 英語化を対象外制約として扱う。 |
| SC-OUT-003 | R005 | S001, S003 | UC002, UC004 | U001 | B003 | skill 本文の大規模責務変更を対象外制約として扱う。 |

## 背景からの追跡

| 目的 | アクター | 外部システム | 要求 |
|---|---|---|---|
| 内部 skill の対象範囲と暗黙起動ポリシーを揃える。 | ACT001 Maintainer, ACT002 Agent, ACT003 Reviewer | EXT001 GitHub | R001, R002, R003, R004, R005 |
| Issue #284 のうち、README 一覧と暗黙起動設定を先に扱う。 | ACT001 Maintainer, ACT002 Agent | EXT001 GitHub | R001, R002, R003, R004 |
| `skill-forge` 監査と `SKILL.md` 英語化を後続候補として分離する。 | ACT001 Maintainer, ACT003 Reviewer | EXT001 GitHub | R005 |

## ボルトからの追跡

| ボルト | ユニット | 要求 |
|---|---|---|
| B001 | U001 | R001, R002 |
| B002 | U001 | R003, R004 |
| B003 | U001 | R005 |

## 設計からの追跡

| 設計 | ユニット | 要求 | ユースケース | ボルト |
|---|---|---|---|---|
| [design.md](units/U001-internal-skill-policy-alignment/design.md) | U001 | R001, R002, R003, R004, R005 | UC001, UC002, UC003, UC004 | B001, B002, B003 |

## 既存コード分析からの追跡

| 分析 | 要求 | ユースケース | ユニット | ボルト | 設計 | 入力 |
|---|---|---|---|---|---|---|
| [codebase-analysis.md](codebase-analysis.md) | R001, R002 | UC001, UC002 | U001 | B001 | [design.md](units/U001-internal-skill-policy-alignment/design.md) | README の現状、source skill と昇格先成果物の構成、Internal Skills 一覧の差分。 |
| [codebase-analysis.md](codebase-analysis.md) | R003, R004 | UC003, UC004 | U001 | B002 | [design.md](units/U001-internal-skill-policy-alignment/design.md) | `skill-forge` の Codex metadata 参照、`policy.allow_implicit_invocation` の型検証、Claude Code 側の未確認事項。 |
| [codebase-analysis.md](codebase-analysis.md) | R005 | UC002, UC004 | U001 | B003 | [design.md](units/U001-internal-skill-policy-alignment/design.md) | `skill-forge` 監査、英語化、Discovery 候補 ID を後続候補として分ける判断材料。 |

## ユニットからの追跡

| ユニット | コンテキスト | 要求 | ユースケース | ボルト |
|---|---|---|---|---|
| U001 | BC001 | R001, R002, R003, R004, R005 | UC001, UC002, UC003, UC004 | B001, B002, B003 |

## ドメインモデルからの追跡

| 種別 | 対象 | 要求 | ユースケース | 定義元 |
|---|---|---|---|---|
| サブドメイン | SD001 自己開発運用 | R001, R002, R003, R004, R005 | UC001, UC002, UC003, UC004 | [domain-map.md](../../../domain-map.md) |
| 境界づけられたコンテキスト | BC001 自己開発運用 | R001, R002, R003, R004, R005 | UC001, UC002, UC003, UC004 | [domain-map.md](../../../domain-map.md) |

## 依存関係からの追跡

| 種別 | 対象 | 依存 | 理由 | 定義元 |
|---|---|---|---|---|
| インテント | 20260702-internal-skill-policy-alignment | なし | Issue #284 の recommended 候補は、現在の skill ディレクトリと README の差分を整理するため、既存 Intent の完了を前提にしない。 | [intents.md](../../../intents.md) |
| 要求 | R001 | なし | README 一覧の現状確認が入口であるため。 | [requirements.md](requirements.md) |
| 要求 | R002 | R001 | 分類判断は README と skill 構成の差分を前提にするため。 | [requirements.md](requirements.md) |
| 要求 | R003 | R002 | 暗黙起動設定は内部 skill 判定を前提にするため。 | [requirements.md](requirements.md) |
| 要求 | R004 | R003 | 設定配置確認は設定対象の判断を前提にするため。 | [requirements.md](requirements.md) |
| 要求 | R005 | R001 | 後続候補分離は Issue #284 の範囲と今回の範囲を比較するため。 | [requirements.md](requirements.md) |
| ユーザーストーリー | S001 | なし | Maintainer の分類判断価値を表すため。 | [user-stories.md](user-stories.md) |
| ユーザーストーリー | S002 | S001 | Agent は分類判断を前提に README と設定対象をそろえるため。 | [user-stories.md](user-stories.md) |
| ユーザーストーリー | S003 | S001, S002 | Reviewer は分類判断と反映結果を確認するため。 | [user-stories.md](user-stories.md) |
| ユースケース | UC001 | なし | 棚卸しが最初の入力になるため。 | [use-cases.md](use-cases.md) |
| ユースケース | UC002 | UC001 | 分類判断は棚卸し結果を前提にするため。 | [use-cases.md](use-cases.md) |
| ユースケース | UC003 | UC002 | 設定配置確認は内部 skill 判定を前提にするため。 | [use-cases.md](use-cases.md) |
| ユースケース | UC004 | UC001, UC002, UC003 | レビューは棚卸し、分類、設定配置確認を前提にするため。 | [use-cases.md](use-cases.md) |
| ユニット | U001 | なし | この Intent は単一の自己開発運用境界を扱うため。 | [units.md](units.md) |
| ボルト | B001 | なし | README と分類判断が後続設定の入力になるため。 | [bolts.md](bolts.md) |
| ボルト | B002 | B001 | 暗黙起動設定は内部 skill 判定を前提にするため。 | [bolts.md](bolts.md) |
| ボルト | B003 | B001, B002 | 後続候補分離と検証証拠は README と設定確認の結果を前提にするため。 | [bolts.md](bolts.md) |
| 判断 | D001 | なし | Inception の所有境界を固定するため。 | [decisions.md](decisions.md) |
| 判断 | D002 | D001 | BC001 を採用済みコンテキストとして参照するため。 | [decisions.md](decisions.md) |
| 判断 | D003 | D001, D002 | Unit と Bolt の粒度を固定するため。 | [decisions.md](decisions.md) |
| 判断 | D004 | D001 | 後続候補分離を固定するため。 | [decisions.md](decisions.md) |
