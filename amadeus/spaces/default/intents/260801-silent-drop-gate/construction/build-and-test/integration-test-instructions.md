# Integration Test Instructions — silent-drop-gate

## 上流成果物と対象

本書は4 Unitの `code-generation-plan.md` と `code-summary.md` を入力とし、filesystem、Git object、CLI、CI workflow、canonical evidence、全caller familyの境界を統合検証する。

## Focused integration

```bash
bun test --timeout 120000 \
  tests/integration/no-silent-drop-gate.test.ts \
  tests/integration/no-silent-drop-repository-adoption.test.ts \
  tests/integration/t413-no-silent-drop-ci-adoption.test.ts \
  tests/integration/t407-resync-noop-detection.test.ts \
  tests/integration/t411-compose-invalid-graph-visibility.test.ts \
  tests/integration/t224-state-set-failclosed.test.ts \
  tests/integration/t76-halt-and-ask-prose-shape.test.ts \
  tests/integration/t278-amadeus-mirror-state-store.integration.test.ts \
  tests/integration/t282-amadeus-mirror-lifecycle.integration.test.ts
```

続いてrepository全体と既知の重い4ファイルを検証する。

```bash
bun tests/run-tests.ts --test-timeout-ms 120000 --ci
bun test --timeout 120000 \
  tests/integration/t227-codex-migration-walking-skeleton.test.ts \
  tests/integration/t-codex-hooks-ownership.test.ts \
  tests/integration/t-codex-hooks-migration.test.ts \
  tests/integration/t-team-up-codex-resume.serial.test.ts
```

## Coverage aggregate

```bash
bun tests/run-tests.ts --test-timeout-ms 120000 --ci --coverage --coverage-dir coverage
bun test --coverage --timeout 120000 \
  tests/integration/t227-codex-migration-walking-skeleton.test.ts \
  tests/integration/t-codex-hooks-ownership.test.ts \
  tests/integration/t-codex-hooks-migration.test.ts \
  tests/integration/t-team-up-codex-resume.serial.test.ts
```

## 合格条件とtest data

- focused、full normal、full isolated、coverage normal、coverage isolatedがすべてexit 0
- full／coverage normalのtimeoutをnamed isolated成功で代替せず、両方を独立した必須証拠とする
- patch coverageはuncovered 0、期限切れallowlist 0、正当化済みspawn-only例外のみ許容し、project coverageは既存baseline以上
- Git／filesystem fixtureは隔離一時workspaceを用い、実repositoryのstate、ledger、evidenceを変更しない
- 23 receiptと25 runのmissing／extra／duplicateが0で、tested revisionとartifact digestが閉じている
