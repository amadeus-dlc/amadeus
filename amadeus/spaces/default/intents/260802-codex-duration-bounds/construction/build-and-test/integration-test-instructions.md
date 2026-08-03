# Integration Test Instructions — Codex Duration Bounds

## 対象と上流

4 Unitの `code-generation-plan.md` と `code-summary.md` で定義されたcore、audit、state projection、distribution、real git worktreeの接続を検証する。各testはtemp workspaceと独立intent identityを使い、実行順・credential・live providerへ依存しない。

## 対象integration／E2E test

```bash
bun test \
  tests/integration/t406-execution-observability-audit.test.ts \
  tests/integration/t409-baseline-manifest.test.ts \
  tests/integration/t410-execution-required-projection.test.ts \
  tests/integration/event-registry-drift.test.ts \
  tests/integration/t270-harness-provenance-birth.test.ts \
  tests/integration/t393-birth-autonomy-field.integration.test.ts \
  tests/integration/t414-bolt-partial-merge-recovery.test.ts \
  tests/integration/t414-swarm-retry-budget.test.ts \
  tests/integration/t245-reviewer-protocol-production-path.test.ts \
  tests/integration/t34-stage-protocol-structure.test.ts \
  tests/integration/t415-interaction-budget-contract.test.ts \
  tests/integration/t425-unit-pool-harness-parity.integration.test.ts \
  tests/e2e/t134-swarm-referee.test.ts
```

全repository回帰は次で実行する。

```bash
bun run test:ci
```

## Fault Injection と隔離

canonical commit前後、state merge後／audit merge前、dispatch confirm前、finish後／reply前、process restart、partial metadata merge、protected-file改変、worktree外pathを注入する。resume可能性を一意な正規証拠から判定できない場合はfail-closedとする。

## 合格基準

対象testとfull suiteがexit 0、assertion failure 0であること。CPU制約による既知timeoutだけは該当fileを `bun test --timeout 120000 <file>` で単独再実行して環境flakeと回帰を分離するが、genuine assertion failureは許容しない。
