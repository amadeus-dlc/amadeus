# 追跡

## 要求からの追跡

| 要求 | アクター | ストーリー | ユースケース | ユニット | ボルト |
|---|---|---|---|---|---|
| R001 | ACT001, ACT002 | S001 | UC001 | U001 | B001 |
| R002 | ACT001, ACT002 | S001 | UC001, UC002 | U001 | B001 |
| R003 | ACT001, ACT002 | S001 | UC001 | U001 | B001 |
| R004 | ACT001, ACT002 | S001 | UC002 | U001 | B001 |
| R005 | ACT001, ACT002 | S001 | UC003 | U002 | B002 |

## 対象境界からの追跡

| 対象境界 | 要求 | ユーザーストーリー | ユースケース | ユニット | ボルト | 扱い |
|---|---|---|---|---|---|---|
| SC-IN-001 | R001 | S001 | UC001 | U001 | B001 | `dry-run` を読み取り専用 mode として扱う。 |
| SC-IN-002 | R002 | S001 | UC001 | U001 | B001 | 候補表示に必要な入力対象として扱う。 |
| SC-IN-003 | R002 | S001 | UC001 | U001 | B001 | 出力項目、判定案、recommended 候補として扱う。 |
| SC-IN-004 | R003 | S001 | UC001 | U001 | B001 | `dry-run` と `scaffold-only` の責務差分として扱う。 |
| SC-IN-005 | R004 | S001 | UC002 | U001 | B001 | 過去分析と学習分類の結果を入力にできる consumer 境界として扱う。 |
| SC-IN-006 | R004 | S001 | UC002 | U001 | B001 | 過去分析、学習分類、候補表示の責務分離として扱う。 |
| SC-IN-007 | R005 | S001 | UC003 | U002 | B002 | source skill、昇格先成果物、eval、validator の検証条件として扱う。 |

## 背景からの追跡

| 目的 | アクター | 外部システム | 要求 |
|---|---|---|---|
| 成果物を作る前に、次に起こすべき Intent 候補を確認する。 | ACT001, ACT002 | EXT001 GitHub | R001, R002, R003 |
| 過去分析と学習分類の結果を候補表示に使う。 | ACT001, ACT002 | EXT001 GitHub | R004 |
| source skill と昇格先成果物の同期と検証を追跡する。 | ACT001, ACT002 | なし | R005 |

## ボルトからの追跡

| ボルト | ユニット | 要求 |
|---|---|---|
| B001 | U001 | R001, R002, R003, R004 |
| B002 | U002 | R005 |

## 設計からの追跡

| 設計 | ユニット | 要求 | ユースケース | ボルト |
|---|---|---|---|---|
| [design.md](units/U001-discovery-dry-run-contract/design.md) | U001 | R001, R002, R003, R004 | UC001, UC002 | B001 |
| [design.md](units/U002-dry-run-sync-verification/design.md) | U002 | R005 | UC003 | B002 |

## 既存コード分析からの追跡

| 分析 | 要求 | ユースケース | ユニット | ボルト | 設計 | 入力 |
|---|---|---|---|---|---|---|
| [codebase-analysis.md](codebase-analysis.md) | R001, R002, R003, R004 | UC001, UC002 | U001 | B001 | [design.md](units/U001-discovery-dry-run-contract/design.md) | `amadeus-discovery` の既存 mode、`dry-run` 入力境界、Issue #272 の受け入れ条件を入力にする。 |
| [codebase-analysis.md](codebase-analysis.md) | R005 | UC003 | U002 | B002 | [design.md](units/U002-dry-run-sync-verification/design.md) | promote-skill、text contract、validator の既存入口を入力にする。 |

## ユニットからの追跡

| ユニット | コンテキスト | 要求 | ユースケース | ボルト |
|---|---|---|---|---|
| U001 | BC001 | R001, R002, R003, R004 | UC001, UC002 | B001 |
| U002 | BC001 | R005 | UC003 | B002 |

## ドメインモデルからの追跡

| 種別 | 対象 | 要求 | ユースケース | 定義元 |
|---|---|---|---|---|
| Bounded Context | BC001 自己開発運用 | R001, R002, R003, R004, R005 | UC001, UC002, UC003 | [domain-map.md](../../../domain-map.md) |

## 依存関係からの追跡

| 種別 | 対象 | 依存 | 理由 | 定義元 |
|---|---|---|---|---|
| インテント | 20260702-amadeus-discovery-dry-run-mode | 20260701-history-learning-review-skills | `dry-run` は過去分析と学習分類の結果を入力にできる必要があるため。 | [intents.md](../../../intents.md) |
| Issue | #272 | #259 | 後段 feedback と Intent 横断学習の分類結果を候補表示に利用できるため。 | [GitHub Issue](https://github.com/amadeus-dlc/amadeus/issues/259) |
| Issue | #272 | #277 | `amadeus-history-review` と `amadeus-learning-review` の責務を入力候補として参照するため。 | [GitHub Issue](https://github.com/amadeus-dlc/amadeus/issues/277) |
| 要求 | R002 | R001 | 入力と出力は、読み取り専用 mode が定義されてから扱えるため。 | [requirements.md](requirements.md) |
| 要求 | R003 | R001 | 副作用禁止と `scaffold-only` 差分は、読み取り専用 mode から導くため。 | [requirements.md](requirements.md) |
| 要求 | R004 | R002, R003 | consumer 境界は、入力と出力、および副作用禁止が定義されてから扱うため。 | [requirements.md](requirements.md) |
| 要求 | R005 | R001, R004 | 同期検証は、`dry-run` の責務と consumer 境界が定義されてから扱うため。 | [requirements.md](requirements.md) |
| ユースケース | UC002 | UC001 | 過去分析と学習分類の結果利用は、候補表示の入力拡張であるため。 | [use-cases.md](use-cases.md) |
| ユースケース | UC003 | UC001, UC002 | 同期検証は、候補表示と consumer 境界が定義されてから扱うため。 | [use-cases.md](use-cases.md) |
| ユニット | U002 | U001 | 同期検証は、`dry-run` 契約が定義されてから扱うため。 | [units.md](units.md) |
| ボルト | B002 | B001 | 昇格先成果物と text contract の検証は、source skill 契約が整ってから扱うため。 | [bolts.md](bolts.md) |
