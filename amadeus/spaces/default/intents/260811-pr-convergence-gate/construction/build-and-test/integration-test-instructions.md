# Integration Test Instructions

入力は `code-generation-plan.md` と `code-summary.md`。core state、plugin CLI、projected sensor scripts、audit、packaging の境界を実ファイルと subprocess で確認する。

## 実行

```bash
bun run test:ci
```

失敗修復後の限定再実行:

```bash
bun test --timeout 120000 \
  tests/unit/t-sensor-fire-seam.test.ts \
  tests/integration/t-sensor-fire-hardening.test.ts \
  tests/integration/t92.test.ts \
  tests/integration/t-coverage-mechanism-ratchet.test.ts \
  tests/unit/t511-blocking-sensor-severity.test.ts \
  tests/integration/t511-blocking-sensor-gate.integration.test.ts
```

## 成功条件とデータ

- full runner が列挙する smoke/unit/integration 983 files を評価する。
- 失敗時は該当ファイルを同じ timeout で隔離再実行し、全 failed assertions を閉包する。
- fixture project、audit shard、sensor directory は test ごとの一時領域を使う。live substrate は利用可能な場合のみ実行する。
