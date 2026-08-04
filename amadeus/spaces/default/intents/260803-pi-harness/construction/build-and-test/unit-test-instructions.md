# Unitテスト手順 — Piハーネス正式対応

## 根拠と対象

Comprehensive戦略に基づき、各Unitの`code-generation-plan.md`と`code-summary.md`から、manifest、Pi 0.83 event parser、lifecycle gate、child driver contract、doctor、package candidate、setup transactionを対象にする。テストはBun標準runnerを再利用し、専用設定は追加しない。

## 実行コマンド

```bash
bun test \
  tests/unit/t-pi-harness-manifest.test.ts \
  tests/integration/t-pi-lifecycle-gate-adapter.test.ts \
  tests/unit/t-pi-driver-contract.test.ts \
  tests/integration/t-pi-doctor-diagnostics.test.ts \
  tests/integration/t-pi-package-candidate.test.ts \
  tests/unit/setup-harness.test.ts \
  tests/unit/setup-harness-parse.test.ts \
  tests/unit/setup-engine-layout.test.ts \
  tests/integration/setup-transaction-coordinator.test.ts \
  tests/unit/t233-driver-resolution.test.ts \
  tests/unit/t285-mirror-projection-registry.test.ts \
  tests/unit/t408-harness-execution-capability.test.ts
```

## 合格基準とデータ管理

- 対象testは全件pass、failure 0とする。
- captured fixtureは`tests/fixtures/pi-0.83-extension-events.json`を正本とする。
- filesystem testはtestごとのtemporary directoryを使い、共有mutable stateを持たない。
- secret、prompt本文、home絶対pathのcanaryがaudit、doctor、replayへ残らないことをassertする。
