# Integration Test Instructions — 260809-sensor-parseflags-failop

上流入力(consumes 全数): code-generation-plan.md(実装ステップと検証手順の宣言元)/ code-summary.md(実装面・検証実測の正本)。

## 実行手順

- 横断負例+単一定義 sweep+FR-7 不変固定: `bun test tests/integration/t521-sensor-flag-value-arms.integration.test.ts`
- 改訂済み契約+完全省略ピン: `bun test tests/integration/t488-depth-budget-sensor.integration.test.ts tests/integration/t514-nfr-budget-sensor.integration.test.ts tests/integration/t519-scope-sizing-sensor.integration.test.ts tests/integration/t517-question-budget-sensor.integration.test.ts`
- フルスイート: `bash tests/run-tests.sh --ci`

## 参照

- 結果の正本: build-test-results.md(本ステージ内)
