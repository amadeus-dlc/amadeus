# Integration テスト手順

各 unit の [code-generation-plan](../election-mixed-lifecycle-cli/code-generation/code-generation-plan.md) と [code-summary](../election-distribution-and-verification/code-generation/code-summary.md) が名指す境界を、process / filesystem の integration と e2e で確認する。

## 実行

```
bun test --timeout 120000 \
  tests/integration/t549-election-v2-store.integration.test.ts \
  tests/integration/t553-election-mixed-lifecycle-cli.integration.test.ts \
  tests/integration/t554-election-mixed-lifecycle-cli.pbt.test.ts \
  tests/integration/t555-election-v2-directive-executor.integration.test.ts \
  tests/integration/t262-elections-migration.integration.test.ts \
  tests/integration/t556-election-legacy-migration.integration.test.ts \
  tests/integration/t557-formal-election-multiq.integration.test.ts \
  tests/integration/t242-election-skill-vocabulary.integration.test.ts \
  tests/integration/t450-pr-convergence-report-format-sensor.integration.test.ts \
  tests/integration/t558-election-distribution-packaging.integration.test.ts \
  tests/e2e/t237-election-walking-skeleton.test.ts
```

## 対象と期待

- U3/U5: mixed lifecycle と hold-only rerun（t553–t555）。
- U6: legacy migrate fidelity（t556 / t262）。
- U7: FormalElection live identity と completeness（t557）。ファイルを読むので integration。
- U8: skill 語彙、投影、公開 CLI dispatch、always-elect（t558 / t242 / t237）。
- rebase 前提: Delivery Bolt 名簿付きの format sensor が code-generation の局所証拠を受理する（t450）。
