# Code Generation Plan — eoc1-gate-guard(Bolt 1)

## 上流入力(consumes 全数)

`../functional-design/business-rules.md`(BR-1〜7)、`../functional-design/domain-entities.md`、`../functional-design/business-logic-model.md`、`../../../inception/requirements-analysis/requirements.md`(FR-1〜5)、`../../../inception/refined-mockups/mockups.md`(M-1〜M-3)。

## 変更目録(正本+テスト、dist は再生成)

| # | ファイル | 変更 |
|---|---------|------|
| 1 | packages/framework/core/tools/amadeus-lib.ts | checkQuestionsEvidence+named helpers 2+定数3(判別ユニオン6理由) |
| 2 | packages/framework/core/tools/amadeus-state.ts | handleGateStart 配線(validateSlugInState 直後、fail-closed)+export |
| 3 | tests/integration/t-eoc1-gate-evidence.test.ts | 新設15テスト(in-process 11+spawn 4) |
| 4 | tests/unit/gen-coverage-registry.test.ts | EXPECTED_NONE_TO_CLI 追記 |
| 5 | tests/.coverage-registry.json / .coverage-ratchet.json | 再生成 |

## 実装中の是正(顕名2件+接地精密化1件)

1. **E-code の Answer 行内限定**(接地精密化 — 実装時自己捕捉): ファイル全域走査だとヘッダの「E-OC1」表記で検査が空文化 — AC-1a「裁定参照」の意味論どおり Answer 行内限定へ。vacuity guard テストでピン
2. 匿名 arrow の ordinal ずれで complexity gate 赤(E-PM2 M7 機序の再実測)→ plain loop 化
3. 新 spawn テストの EXPECTED_NONE_TO_CLI 追記(integration-registry-regen)
