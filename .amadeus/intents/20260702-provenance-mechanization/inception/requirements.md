# 要求

## 一覧

| 識別子 | 概要 | 状態 | 依存 | 詳細 |
|---|---|---|---|---|
| R001 | provenance 記録の生成: 作業実行の事実を実測して、対象 Intent 直下の `provenance/` に機械可読 JSON として出力できる。 | 採用済み | なし | [R001-provenance-record-generation.md](requirements/R001-provenance-record-generation.md) |
| R002 | 記録と実測の照合: 記録済みの値を再計算して照合し、md5 不一致、commit 不一致、参照先欠落を検出して失敗として報告できる。 | 採用済み | R001 | [R002-record-measurement-reconciliation.md](requirements/R002-record-measurement-reconciliation.md) |
| R003 | 標準検証への組み込み: 照合が `npm run test:all` の chain に含まれ、drift があると標準検証が fail する。 | 採用済み | R002 | [R003-standard-verification-integration.md](requirements/R003-standard-verification-integration.md) |
| R004 | 記録方法の文書整合: policies.md と development.md の記述が、新しい記録先と矛盾しない。 | 採用済み | R001, R002 | [R004-record-method-documentation-alignment.md](requirements/R004-record-method-documentation-alignment.md) |
| R005 | 検査責務境界の追跡可能性: validator、provenance:check、evaluator の検査責務の境界が decisions から追跡できる。 | 採用済み | なし | [R005-inspection-boundary-traceability.md](requirements/R005-inspection-boundary-traceability.md) |

## 依存関係

| 要求 | 依存 | 理由 |
|---|---|---|
| R001 | なし | 実測して JSON を出力する契約は他の要求に依存せず定義できるため。 |
| R002 | R001 | 照合は R001 が定める記録形式を前提にするため。 |
| R003 | R002 | 標準検証への組み込みは、R002 の照合ロジックが存在することを前提にするため。 |
| R004 | R001, R002 | 文書整合は、生成と照合の実装方針の記述を反映するため。 |
| R005 | なし | 検査責務境界の追跡可能性は、他の要求の実装内容と独立に、grilling の確定判断（GD003）から定義できるため。 |

## 受け入れ状態

| 要求 | 状態 | 証拠 |
|---|---|---|
| R001 | 採用済み | 未登録 |
| R002 | 採用済み | 未登録 |
| R003 | 採用済み | 未登録 |
| R004 | 採用済み | 未登録 |
| R005 | 採用済み | 未登録 |

## Requirements Review Gate

| 観点 | 状態 | 根拠 |
|---|---|---|
| Ideation scope との対応 | passed | SC-IN-001 を R001、R002、R005、SC-IN-002 を R001、R002 の eval 先行の受け入れ条件、SC-IN-003 を R003、SC-IN-004 と SC-IN-005 を R004 に対応付けた。 |
| 対象外の維持 | passed | 証拠内容の意味評価（SC-OUT-001）、steering knowledge の契約変更（SC-OUT-002）、LLM による意味評価（SC-OUT-003）、`examples/skill-provenance.json` の置き換え（SC-OUT-004）を要求に含めていない。SC-OUT-001 と SC-OUT-004 は D001 と D003 で境界を明示した。 |
| 依存関係 | passed | 生成、照合、標準検証組み込み、文書整合の順に依存を定義し、検査責務境界の追跡可能性（R005）は grilling の確定判断から独立に定義した。 |
| 検証可能性 | passed | 各要求は eval の RED → GREEN 記録、`provenance:check` の drift 検出、`npm run test:all` の pass、policies.md／development.md の記述確認、decisions からの追跡確認から検証できる。 |

## 未確認事項

- なし。
