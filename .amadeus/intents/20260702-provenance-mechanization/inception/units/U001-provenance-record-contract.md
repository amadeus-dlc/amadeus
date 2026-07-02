# U001 provenance 記録契約

## ユニット

provenance 記録の生成、記録と実測の照合、標準検証への組み込み、記録方法の文書整合、検査責務境界の追跡可能性を、信頼できる provenance 記録の契約として成立させる Unit である。

## 対象要求

- R001
- R002
- R003
- R004
- R005

## 価値境界

この Unit は、`provenance:generate` と `provenance:check` の dev-scripts、`npm run test:all` chain への組み込み、`.amadeus/steering/policies.md` と `.amadeus/development.md` の記録方法の記述整合、検査責務境界（validator、provenance:check、evaluator）の decisions への記録を扱う。

証拠内容の意味評価（#240 evaluator の対象）、steering knowledge の契約変更（#297 の対象）、`examples/skill-provenance.json` の置き換えは扱わない。

## 検証観点

- `provenance:generate` の出力だけで policies.md の最低記録項目 9 項目を満たせる。
- `provenance:check` が md5 不一致、commit 不一致、参照先欠落を検出して失敗として報告できる。
- 検査対象が `provenance/` ディレクトリが存在する Intent だけに限られ、既存 Intent へ遡及しない。
- `provenance:check` の実行が `npm run test:all` の chain に含まれ、drift があると標準検証が fail する。
- eval が実装前に失敗することを確認してから実装されている（TDD 記録）。
- policies.md と development.md の記述が、生成スクリプト前提の記録方法と矛盾しない。
- 検査責務の境界（validator、provenance:check、evaluator）が decisions から追跡できる。

## 未確認事項

- JSON スキーマの項目の詳細型と命名、`provenance/` 配下のファイル命名規則は Construction の Functional Design で確定する。

## 実装対象

| 識別子 | repository | path | branch | PR | CI |
|---|---|---|---|---|---|
| IT001 | amadeus-dlc/amadeus | `dev-scripts/`（`provenance:generate`、`provenance:check` の新設） | 未確認 | なし | 未確認 |
| IT002 | amadeus-dlc/amadeus | `dev-scripts/evals/` 配下の eval（新設） | 未確認 | なし | 未確認 |
| IT003 | amadeus-dlc/amadeus | `package.json`（`provenance:generate`、`provenance:check` の実行入口、`test:all` chain への組み込み） | 未確認 | なし | 未確認 |
| IT004 | amadeus-dlc/amadeus | `.amadeus/steering/policies.md` | 未確認 | なし | 未確認 |
| IT005 | amadeus-dlc/amadeus | `.amadeus/development.md` | 未確認 | なし | 未確認 |

## 関連成果物

- [design.md](U001-provenance-record-contract/design.md)
