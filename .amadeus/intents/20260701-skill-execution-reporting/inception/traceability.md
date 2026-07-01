# 追跡

## 要求からの追跡

| 要求 | アクター | ストーリー | ユースケース | ユニット | ボルト |
|---|---|---|---|---|---|
| R001 | ACT002 Agent | S001 | UC001, UC002 | U001 | B001 |
| R002 | ACT002 Agent | S001 | UC001, UC002 | U001 | B001 |
| R003 | ACT001 Maintainer | S001 | UC002 | U001 | B001 |
| R004 | ACT003 Reviewer | S001 | UC003 | U002 | B002 |

## 対象境界からの追跡

| 対象境界 | 要求 | ユーザーストーリー | ユースケース | ユニット | ボルト | 扱い |
|---|---|---|---|---|---|---|
| SC-IN-001 | R001, R002 | S001 | UC001 | U001 | B001 | skill 実行中に見つかる問題や懸念の報告方針として扱う。 |
| SC-IN-002 | R001, R003 | S001 | UC001, UC002 | U001 | B001 | 現在の Intent と後続 Issue 候補の分類基準として扱う。 |
| SC-IN-003 | R002 | S001 | UC001 | U001 | B001 | 報告内容の最低項目として扱う。 |
| SC-IN-004 | R001, R002, R003, R004 | S001 | UC001, UC002, UC003 | U001, U002 | B001, B002 | 内部 skill ではなく共通契約から始め、validator または evaluator 後段候補を報告項目に含める判断として扱う。 |
| SC-IN-005 | R004 | S001 | UC003 | U002 | B002 | 代表 skill と eval の整合確認として扱う。 |

## 背景からの追跡

| 目的 | アクター | 外部システム | 要求 |
|---|---|---|---|
| amadeus-* skill 実行中に見つかった問題や懸念を、現在の Intent 成果物と混ぜずに扱う。 | ACT001 Maintainer, ACT002 Agent, ACT003 Reviewer | EXT001 GitHub | R001, R002, R003, R004 |
| Issue #248 を、先行 Intent の自己開発作業で見つかった運用上の問題として扱う。 | ACT001 Maintainer, ACT002 Agent | EXT001 GitHub | R001, R002, R003, R004 |

## ボルトからの追跡

| ボルト | ユニット | 要求 |
|---|---|---|
| B001 | U001 | R001, R002, R003 |
| B002 | U002 | R004 |

## 設計からの追跡

| 設計 | ユニット | 要求 | ユースケース | ボルト |
|---|---|---|---|---|
| [design.md](units/U001-reporting-contract/design.md) | U001 | R001, R002, R003 | UC001, UC002 | B001 |
| [design.md](units/U002-skill-adoption-verification/design.md) | U002 | R004 | UC003 | B002 |

## 既存コード分析からの追跡

| 分析 | 要求 | ユースケース | ユニット | ボルト | 設計 | 入力 |
|---|---|---|---|---|---|---|
| [codebase-analysis.md](codebase-analysis.md) | R001, R002, R003 | UC001, UC002 | U001 | B001 | [design.md](units/U001-reporting-contract/design.md) | 報告先分類、最低項目、人間承認付き Issue 候補化、validator と内容承認の境界。 |
| [codebase-analysis.md](codebase-analysis.md) | R004 | UC003 | U002 | B002 | [design.md](units/U002-skill-adoption-verification/design.md) | source skill、昇格先 skill、llm templates eval、amadeus templates eval の整合確認。 |

## ユニットからの追跡

| ユニット | コンテキスト | 要求 | ユースケース | ボルト |
|---|---|---|---|---|
| U001 | BC001 | R001, R002, R003 | UC001, UC002 | B001 |
| U002 | BC001 | R004 | UC003 | B002 |

## ドメインモデルからの追跡

| 種別 | 対象 | 要求 | ユースケース | 定義元 |
|---|---|---|---|---|
| サブドメイン | SD001 自己開発運用 | R001, R002, R003, R004 | UC001, UC002, UC003 | [domain-map.md](../../../domain-map.md) |
| 境界づけられたコンテキスト | BC001 自己開発運用 | R001, R002, R003, R004 | UC001, UC002, UC003 | [domain-map.md](../../../domain-map.md) |

## 依存関係からの追跡

| 種別 | 対象 | 依存 | 理由 | 定義元 |
|---|---|---|---|---|
| インテント | 20260701-skill-execution-reporting | 20260701-construction-finalization-traceability-skill | Issue #248 は、Issue #245 の自己開発作業中に見つかった skill 実行上の問題報告の扱いを標準化するため。 | [intents.md](../../../intents.md) |
| 要求 | R001 | なし | 報告先分類が最低項目と Issue 候補化の前提であるため。 | [requirements.md](requirements.md) |
| 要求 | R002 | R001 | 最低項目には分類結果と報告先を含めるため。 | [requirements.md](requirements.md) |
| 要求 | R003 | R001, R002 | Issue 候補化は分類結果と最低項目を前提にするため。 | [requirements.md](requirements.md) |
| 要求 | R004 | R001, R002, R003 | skill と eval の整合は、採用する報告契約を前提にするため。 | [requirements.md](requirements.md) |
| ユーザーストーリー | S001 | なし | Maintainer の分類判断価値を表すため。 | [user-stories.md](user-stories.md) |
| ユースケース | UC001 | なし | 懸念検出と分類が他の相互作用の前提であるため。 | [use-cases.md](use-cases.md) |
| ユースケース | UC002 | UC001 | 後続 Issue 候補レビューは、分類済みの報告を前提にするため。 | [use-cases.md](use-cases.md) |
| ユースケース | UC003 | UC001, UC002 | 契約整合レビューは、分類基準と Issue 候補化の扱いを前提にするため。 | [use-cases.md](use-cases.md) |
| ユニット | U001 | なし | 報告契約の分類基準と最低項目が、代表 skill 反映の前提であるため。 | [units.md](units.md) |
| ユニット | U002 | U001 | 代表 skill と eval の整合確認は、採用する報告契約を前提にするため。 | [units.md](units.md) |
| ボルト | B001 | なし | 共通契約の定義が代表 skill 反映の前提であるため。 | [bolts.md](bolts.md) |
| ボルト | B002 | B001 | 昇格先 skill と eval は、source skill に定義した契約を基準に確認するため。 | [bolts.md](bolts.md) |
| 判断 | D001 | なし | Inception の所有境界を固定するため。 | [decisions.md](decisions.md) |
| 判断 | D002 | D001 | BC001 を採用済みコンテキストとして参照するため。 | [decisions.md](decisions.md) |
| 判断 | D003 | D001, D002 | 内部 skill ではなく共通契約から始める判断を固定するため。 | [decisions.md](decisions.md) |
| 判断 | D004 | D001, D002, D003 | Unit と Bolt の粒度を固定するため。 | [decisions.md](decisions.md) |
