# 追跡

## 要求からの追跡

| 要求 | アクター | ストーリー | ユースケース | ユニット | ボルト |
|---|---|---|---|---|---|
| R001 | ACT002 Agent | なし | UC001 | U001 | B001 |
| R002 | ACT002 Agent | なし | UC002 | U001 | B002 |
| R003 | ACT002 Agent | なし | UC002 | U001 | B002 |
| R004 | ACT001 Maintainer | なし | UC003 | U001 | B003 |
| R005 | ACT001 Maintainer | なし | UC003 | U001 | B003 |

## 対象境界からの追跡

### 対象

| 対象境界 | 要求 | ユーザーストーリー | ユースケース | ユニット | ボルト | 扱い |
|---|---|---|---|---|---|---|
| SC-IN-001 | R001, R002, R005 | なし | UC001, UC002 | U001 | B001, B002 | `provenance:generate` と `provenance:check` の dev-scripts を実装し、検査責務境界を確定する。 |
| SC-IN-002 | R001, R002 | なし | UC001, UC002 | U001 | B001, B002 | 先に失敗する eval を追加してから実装する（TDD）。 |
| SC-IN-003 | R003 | なし | UC002 | U001 | B002 | `provenance:check` を `npm run test:all` の chain に組み込む。 |
| SC-IN-004 | R004 | なし | UC003 | U001 | B003 | policies.md の provenance 記録方法を生成スクリプト前提へ更新する。 |
| SC-IN-005 | R004 | なし | UC003 | U001 | B003 | development.md の stage と workspace 対応記録の表を新しい記録先に合わせて更新する。 |

### 対象外

| 対象境界 | 扱い |
|---|---|
| SC-OUT-001 | 証拠内容の意味評価（#240 evaluator の対象）。この Intent の要求に含めない。D001 の検査責務境界で evaluator の関心事として明示した。 |
| SC-OUT-002 | steering knowledge の契約変更（#297 の対象）。この Intent の要求に含めない。 |
| SC-OUT-003 | LLM による意味評価。この Intent の要求に含めない。 |
| SC-OUT-004 | `examples/skill-provenance.json` の置き換え。D003 で並立させる判断を記録し、統合はこの Intent の対象外とする。 |

## 背景からの追跡

| 背景 | 追跡先 | 根拠 |
|---|---|---|
| Issue #296 | R001, R002, R003, R004, R005 | provenance 記録の生成と検証の機械化を求める入力であるため。 |
| Issue #315 | R005, D001 | 親 Issue として、検査責務境界の受け入れ条件を確定した入力であるため。 |
| Discovery [20260702-evidence-record-and-evaluation](../../../discoveries/20260702-evidence-record-and-evaluation.md) | Ideation D001 | recommended 候補判断（GD001、Ideation 側）から、この Intent を最初に進める依存順を確定した入力であるため。 |
| 既存 Ideation scope | SC-IN-001 から SC-IN-005、SC-OUT-001 から SC-OUT-004 | Inception の要求境界を Ideation の採用境界と対象外境界から引き継ぐため。 |
| [G001](grillings/G001-inception-record-contract.md) | R001, R002, D001, D002, D003 | 置き場所（GD001）、遡及範囲（GD002）、検査責務境界（GD003）、`examples/skill-provenance.json` との関係（GD004）の確定判断を反映するため。 |
| 手書き provenance の実データ観察 | R001 | `.amadeus/intents/20260629-self-dev-steering-layer/ideation/traceability.md` で commit と md5 が手書きで転記されている観察を根拠にするため。 |

## ボルトからの追跡

| ボルト | ユニット | 要求 | 受け入れ状態 | Construction での主な成果 |
|---|---|---|---|---|
| B001 | U001 | R001 | R001 | `provenance:generate` の dev-script と eval を実装する（eval 先行）。 |
| B002 | U001 | R002, R003 | R002, R003 | `provenance:check` の dev-script と eval を実装し、`npm run test:all` の chain へ組み込む。 |
| B003 | U001 | R004, R005 | R004, R005 | policies.md と development.md の記録方法を更新し、検査責務境界を decisions に記録する。 |

## 設計からの追跡

| 設計 | ユニット | 要求 | ユースケース | ボルト |
|---|---|---|---|---|
| [design.md](units/U001-provenance-record-contract/design.md) | U001 | R001, R002, R003, R004, R005 | UC001, UC002, UC003 | B001, B002, B003 |

## 既存コード分析からの追跡

| 分析 | 要求 | ユースケース | ユニット | ボルト | 設計 | 入力 |
|---|---|---|---|---|---|---|
| [codebase-analysis.md](codebase-analysis.md) | R001 | UC001 | U001 | B001 | [design.md](units/U001-provenance-record-contract/design.md) | `dev-scripts/` の既存配置方式（`promote-skill.ts`、`StateScaffold.ts`）が `provenance:generate` の配置先として使える。 |
| [codebase-analysis.md](codebase-analysis.md) | R001 | UC001 | U001 | B001 | [design.md](units/U001-provenance-record-contract/design.md) | 手書き provenance の実データ（20260629-self-dev-steering-layer）が、実測なしで値が pass する問題を裏付ける。 |
| [codebase-analysis.md](codebase-analysis.md) | R002, R003 | UC002 | U001 | B002 | [design.md](units/U001-provenance-record-contract/design.md) | `package.json` の `test:all` chain 構造（`test:it:all` 配下への追加パターン）が `provenance:check` の組み込み先として使える。 |
| [codebase-analysis.md](codebase-analysis.md) | R004, R005 | UC003 | U001 | B003 | [design.md](units/U001-provenance-record-contract/design.md) | policies.md と development.md の現在の記述、`AmadeusValidator.ts` に provenance 関連の検査が存在しないことが検査責務境界の根拠になる。 |

## ユニットからの追跡

| ユニット | コンテキスト | 要求 | ユースケース | ボルト |
|---|---|---|---|---|
| U001 | BC001 | R001, R002, R003, R004, R005 | UC001, UC002, UC003 | B001, B002, B003 |

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
| インテント | 20260702-provenance-mechanization | 20260701-self-development-cycle-stage-workspace | Issue #296 は、Intent 20260701-self-development-cycle-stage-workspace の U002 Unit Design Brief が残した「evidence を JSON として標準化する必要が出た場合」という再確認条件の発火元であるため。 | [intents.md](../../../intents.md) |
| Issue | #296 | #315 | 親 Issue #315 の子 Issue であり、Discovery の進め方（#296 と #297 で記録形式を確定してから #240 を扱う）で依存順が確定しているため。 | [GitHub Issue](https://github.com/amadeus-dlc/amadeus/issues/315) |
| アクター | ACT001 Maintainer | なし | 記録方法と検査責務境界を参照して判断するため。 | [actors.md](../../../steering/actors.md) |
| アクター | ACT002 Agent | なし | provenance 生成の実行と、CI fail 時の修正を行うため。 | [actors.md](../../../steering/actors.md) |
| 外部システム | EXT001 GitHub | なし | CI（GitHub Actions）が `npm run test:all` を実行するため。 | [external-systems.md](../../../steering/external-systems.md) |
| 要求 | R001 | なし | 実測して JSON を出力する契約は他の要求に依存せず定義できるため。 | [requirements.md](requirements.md) |
| 要求 | R002 | R001 | 照合は R001 が定める記録形式を前提にするため。 | [requirements.md](requirements.md) |
| 要求 | R003 | R002 | 標準検証への組み込みは R002 の照合ロジックを前提にするため。 | [requirements.md](requirements.md) |
| 要求 | R004 | R001, R002 | 文書整合は生成と照合の実装方針の記述を反映するため。 | [requirements.md](requirements.md) |
| 要求 | R005 | なし | 検査責務境界の追跡可能性は grilling の確定判断（GD003）から独立に定義できるため。 | [requirements.md](requirements.md) |
| ユースケース | UC001 | なし | provenance 記録の生成は他の相互作用に依存せず成立するため。 | [use-cases.md](use-cases.md) |
| ユースケース | UC002 | UC001 | 照合対象の JSON は UC001 の生成で作られるため。 | [use-cases.md](use-cases.md) |
| ユースケース | UC003 | なし | 記録方法と検査責務境界の参照は UC001 の実行結果に依存しないため。 | [use-cases.md](use-cases.md) |
| ユニット | U001 | なし | 生成、照合、標準検証組み込み、文書整合、検査責務境界の追跡可能性を単一の価値単位として扱うため。 | [units.md](units.md) |
| ボルト | B001 | なし | 生成スクリプトの存在と記録形式が、照合と文書記述の前提であるため。 | [bolts.md](bolts.md) |
| ボルト | B002 | B001 | 照合は B001 が生成する記録形式を対象にするため。 | [bolts.md](bolts.md) |
| ボルト | B003 | B001, B002 | 文書整合は生成と照合の実装方針を反映するため。 | [bolts.md](bolts.md) |
| 判断 | D001 | なし | 検査責務境界は grilling の確定判断（GD003）から独立に固定できるため。 | [decisions.md](decisions.md) |
| 判断 | D002 | D001 | 検査対象境界は、検査責務境界が決まってから `provenance:check` の責務範囲として確定するため。 | [decisions.md](decisions.md) |
| 判断 | D003 | D001 | 既存契約との関係整理は、検査責務境界が決まってから判断するため。 | [decisions.md](decisions.md) |
| 判断 | D004 | なし | JSON スキーマの項目構成は受け入れ条件から一意に導けるため、他の判断と独立に確定できる。 | [decisions.md](decisions.md) |
| 判断 | D005 | D001, D002, D003, D004 | Unit 分割の例外理由と Inception 完了判断は、他の判断がすべて確定してから記録するため。 | [decisions.md](decisions.md) |
| Context Map | BC001 | なし | 採用済みまたは廃止済みのコンテキスト間依存は存在しないため。 | [context-map.md](../../../context-map.md) |

## Inception Gate

| 観点 | 状態 | 根拠 |
|---|---|---|
| 要求追跡 | passed | R001 から R005 までを use case、unit、bolt に対応付けた。 |
| 対象境界追跡 | passed | SC-IN-001 から SC-IN-005、SC-OUT-001 から SC-OUT-004 までを要求、bolt、decisions に対応付けた。 |
| ドメイン参照 | passed | Unit の context は Domain Map の adopted Bounded Context である BC001 を参照する。 |
| 依存関係 | passed | Unit と Bolt の依存を明示し、Context Map に未登録依存がないことを確認した。 |
