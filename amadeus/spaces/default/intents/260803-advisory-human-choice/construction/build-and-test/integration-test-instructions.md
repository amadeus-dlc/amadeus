# Integration and E2E Test Instructions — advisory-human-choice

## 上流成果物と検証境界

`code-generation-plan.md`と`code-summary.md`が定義するengine、plugin activation、監査side-ledger、harness projectionの境界を検証する。unitで証明したdomain契約がmain workflow、`--single`、per-unit、3 checkpoint、配布projectionで失われないことを確認する。

## Integration実行コマンド

```bash
bun test --timeout 120000 \
  tests/unit/t149-codex-hook-adapter.test.ts \
  tests/integration/t-advisory-human-choice-domain.test.ts \
  tests/integration/t-formal-verif-run-model-check-artifacts.integration.test.ts \
  tests/integration/t322-activation-lifecycle-behaviour.integration.test.ts \
  tests/integration/t378-advisories-directive-field.integration.test.ts \
  tests/integration/t381-advisory-checkpoints-latch.integration.test.ts
```

## E2E実行コマンド

```bash
bun test --timeout 120000 \
  tests/e2e/t-advisory-human-choice-rendering.e2e.test.ts
```

## Full regression実行コマンド

```bash
bun run test:ci
```

30秒timeoutだけが発生した場合は、対象fileを120秒・直列で再実行する。再実行でも失敗する場合は実装failureとして扱う。

## 主要テストケース

- `requirements-analysis`、`functional-design`、`build-and-test`のstage body開始前hold。
- main、`--single`、per-unitのdirect report bypass拒否。
- `never-run`、`changed`、`not-ready`と、silentな`current`、`not-composed`。
- local Formal Model Check成果物のtarget/spec/instance/source digest相関。
- 7 harnessの配布projectionを別Bun processから実行し、question renderingの逐語性を検証する。
- Codex adapterの実際の`mint` subprocess境界でprotected receiptを生成する。

## 成功条件

- focused integrationとE2Eが全件passする。
- full regressionで実装変更に相関する失敗が0件である。
- timeoutを環境要因と分類する場合、同一fileの直列再実行成功を証拠として残す。
