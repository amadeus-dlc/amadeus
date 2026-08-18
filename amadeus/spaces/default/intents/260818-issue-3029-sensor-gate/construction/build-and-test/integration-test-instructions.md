# Integration Test Instructions

## 上流入力

`construction/sensor-gate/code-generation/code-generation-plan.md` と `code-summary.md` の t511/t92 境界を検証する。

## 実行

- `bun test --timeout 120000 tests/integration/t511-blocking-sensor-gate.integration.test.ts`
- `bun test --timeout 120000 tests/integration/t92.test.ts`
- Comprehensive の統合確認として、対象 3 ファイルをまとめて `bun test --timeout 120000 tests/unit/t511-blocking-sensor-severity.test.ts tests/integration/t511-blocking-sensor-gate.integration.test.ts tests/integration/t92.test.ts` でも実行する。

## 合否

exit 127 の実 dispatcher row は `SENSOR_PASSED` + `tool-unavailable` を維持し、blocking approve は state 未変更で拒否すること。spawn-failed は `script-error: spawn-failed` として別扱いであること。
