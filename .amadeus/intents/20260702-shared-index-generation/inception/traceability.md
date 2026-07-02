# 追跡

## 要求からの追跡

| 要求 | アクター | ストーリー | ユースケース | ユニット | ボルト |
|---|---|---|---|---|---|
| R001 | ACT002 Agent | なし | UC001 | U001 | B001, B004 |
| R002 | ACT002 Agent | なし | UC001, UC002 | U001 | B001 |
| R003 | ACT002 Agent | なし | UC001 | U001 | B001 |
| R004 | ACT002 Agent | なし | UC003 | U001 | B002 |
| R005 | ACT002 Agent | なし | UC001 | U001 | B001, B003 |
| R006 | ACT002 Agent | なし | UC003 | U001 | B004 |
| R007 | ACT002 Agent | なし | UC002, UC003 | U001 | B001, B002 |

## 対象境界からの追跡

| 対象境界 | 要求 | ユーザーストーリー | ユースケース | ユニット | ボルト | 扱い |
|---|---|---|---|---|---|---|
| SC-IN-001 | R001, R002, R003, R006 | なし | UC001, UC002 | U001 | B001, B004 | 定義元の移設、決定論的再生成、生成マーカーを生成契約として実装し、既存データを適合させる。 |
| SC-IN-002 | R004, R006 | なし | UC003 | U001 | B002, B004 | validator の不整合検査として実装し、migration 後の pass を確認する。 |
| SC-IN-003 | R005 | なし | UC001 | U001 | B001, B003 | validator 同梱スクリプトの配置と writer skill の手順更新で実現する。 |
| SC-IN-004 | R007 | なし | UC002, UC003 | U001 | B001, B002 | 失敗する検証を先行追加し、RED を確認してから実装する。 |

## 背景からの追跡

| 背景 | 追跡先 | 根拠 |
|---|---|---|
| Issue #334 | R001, R002, R003, R004, R005, R006, R007 | 共有インデックスの生成物化を求める入力であるため。 |
| Discovery 20260702-parallel-execution | Ideation D001 | recommended 候補の選定と、他候補を後に扱う依存順を確定した入力であるため。 |
| 既存 Ideation scope | SC-IN-001 から SC-IN-004 | Inception の要求境界を Ideation の採用境界から引き継ぐため。 |
| [G001](grillings/G001-index-generation-contract.md) | R001, R003, R005 | 定義元の移設、生成マーカー、生成入口の配置先の確定判断を反映するため。 |
| 並行作業の観察 | R002 | Issue #309 の Construction と本 Intent の Ideation の並行作業で、`intents.md` が唯一の共有接触面だった観察を根拠にするため。 |

## ボルトからの追跡

| ボルト | ユニット | 要求 | 受け入れ状態 | Construction での主な成果 |
|---|---|---|---|---|
| B001 | U001 | R001, R002, R003, R005, R007 | R001, R002, R003, R005, R007 | 再生成スクリプトと検証を実装する（検証先行）。 |
| B002 | U001 | R004, R007 | R004, R007 | validator の不整合検査と生成マーカー検査を追加する。 |
| B003 | U001 | R005 | R005 | writer skill の手順と steering テンプレートを更新し、promote で同期する。 |
| B004 | U001 | R001, R006 | R001, R006 | workspace と examples の migration を実施する。 |

## 設計からの追跡

| 設計 | ユニット | 要求 | ユースケース | ボルト |
|---|---|---|---|---|
| [design.md](units/U001-shared-index-generation-contract/design.md) | U001 | R001, R002, R003, R004, R005, R006, R007 | UC001, UC002, UC003 | B001, B002, B003, B004 |

## 既存コード分析からの追跡

| 分析 | 要求 | ユースケース | ユニット | ボルト | 設計 | 入力 |
|---|---|---|---|---|---|---|
| [codebase-analysis.md](codebase-analysis.md) | R001, R002 | UC001, UC002 | U001 | B001 | [design.md](units/U001-shared-index-generation-contract/design.md) | 定義元が index にしかない（21 件中 0 件）ことと、index の列構成の確認。 |
| [codebase-analysis.md](codebase-analysis.md) | R004 | UC003 | U001 | B002 | [design.md](units/U001-shared-index-generation-contract/design.md) | `checkIntents()` と discoveries の突き合わせ検査が不整合検査の追加位置になる。 |
| [codebase-analysis.md](codebase-analysis.md) | R005 | UC001 | U001 | B003 | [design.md](units/U001-shared-index-generation-contract/design.md) | writer skill と steering テンプレートの特定。StateScaffold の同梱配置パターンを再利用できる。 |
| [codebase-analysis.md](codebase-analysis.md) | R006 | UC003 | U001 | B004 | [design.md](units/U001-shared-index-generation-contract/design.md) | examples の 4 snapshot が対象で、skill と template の契約変更を先行させる規約がある。 |

## ユニットからの追跡

| ユニット | コンテキスト | 要求 | ユースケース | ボルト |
|---|---|---|---|---|
| U001 | BC001 | R001, R002, R003, R004, R005, R006, R007 | UC001, UC002, UC003 | B001, B002, B003, B004 |

## ドメインモデルからの追跡

| 種別 | 対象 | 要求 | ユースケース | 定義元 |
|---|---|---|---|---|
| サブドメイン | SD001 自己開発運用 | R001, R002, R003, R004, R005, R006, R007 | UC001, UC002, UC003 | [domain-map.md](../../../domain-map.md) |
| 境界づけられたコンテキスト | BC001 自己開発運用 | R001, R002, R003, R004, R005, R006, R007 | UC001, UC002, UC003 | [domain-map.md](../../../domain-map.md) |

Inception では詳細な Domain Model を作らない。

Domain Map と Context Map は、採用済みの Bounded Context と依存関係の参照元として使う。

## 依存関係からの追跡

| 種別 | 対象 | 依存 | 理由 | 定義元 |
|---|---|---|---|---|
| 要求 | R001 | なし | 定義元の移設は他の要求に依存せず定義できるため。 | [requirements.md](requirements.md) |
| 要求 | R002 | R001 | 再生成は、概要と依存の定義元が配下モジュールに揃っていることが前提になるため。 | [requirements.md](requirements.md) |
| 要求 | R003 | R002 | マーカーは再生成が出力するファイルの一部であるため。 | [requirements.md](requirements.md) |
| 要求 | R004 | R002, R003 | 不整合検査は、生成規則とマーカーの存在が前提になるため。 | [requirements.md](requirements.md) |
| 要求 | R005 | R002 | 手順とテンプレートの更新は、参照する生成入口の実在が前提になるため。 | [requirements.md](requirements.md) |
| 要求 | R006 | R001, R002, R003, R004, R005 | 既存データの適合は、契約、生成、検査、手順のすべてが確定した後に成立するため。 | [requirements.md](requirements.md) |
| 要求 | R007 | R002, R004 | 検証は再生成の契約と不整合検査を対象にするため。 | [requirements.md](requirements.md) |
| ユースケース | UC001 | なし | モジュール変更時の再生成は他の相互作用に依存せず成立するため。 | [use-cases.md](use-cases.md) |
| ユースケース | UC002 | UC001 | 並行統合後の再生成は UC001 の再生成の動作を前提にするため。 | [use-cases.md](use-cases.md) |
| ユースケース | UC003 | UC001 | 不整合の検出対象と解消手段は UC001 の生成規則で定義されるため。 | [use-cases.md](use-cases.md) |
| ユニット | U001 | なし | 定義元の移設、再生成、検査、手順更新、migration は同じ生成契約を共有する単一の価値単位であるため。 | [units.md](units.md) |
| ボルト | B001 | なし | 生成規則と見出し契約が、検査、手順、migration すべての前提であるため。 | [bolts.md](bolts.md) |
| ボルト | B002 | B001 | 不整合検査は生成規則の再利用として実装するため。 | [bolts.md](bolts.md) |
| ボルト | B003 | B001 | 手順が参照するスクリプトの path と引数体系が前提になるため。 | [bolts.md](bolts.md) |
| ボルト | B004 | B001, B002, B003 | migration の完了確認は、生成、検査、手順のすべてが確定した状態での validator pass を根拠にするため。 | [bolts.md](bolts.md) |
| 判断 | D001 | なし | Inception の所有境界を固定するため。 | [decisions.md](decisions.md) |
| 判断 | D002 | D001 | 所有境界が決まってから User Stories の要否を確定するため。 | [decisions.md](decisions.md) |
| 判断 | D003 | D001 | 所有境界が決まってから成果物の粒度例外を判断するため。 | [decisions.md](decisions.md) |
| Context Map | BC001 | なし | 採用済みまたは廃止済みのコンテキスト間依存は存在しないため。 | [context-map.md](../../../context-map.md) |

## Inception Gate

| 観点 | 状態 | 根拠 |
|---|---|---|
| 要求追跡 | passed | R001 から R007 までを use case、unit、bolt に対応付けた。 |
| 対象境界追跡 | passed | SC-IN-001 から SC-IN-004 までを要求と bolt に対応付けた。 |
| ドメイン参照 | passed | Unit の context は Domain Map の adopted Bounded Context である BC001 を参照する。 |
| 依存関係 | passed | Unit と Bolt の依存を明示し、Context Map に未登録依存がないことを確認した。 |
