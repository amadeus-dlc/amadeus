# Integration Test Instructions

## 上流成果物と境界

5 Unitの `code-generation-plan.md` / `code-summary.md` に従い、共通lifecycleとCodex/Claude print/SDK/TUI adapterの境界をfake processで統合検証する。対象境界はcredential binding、fresh scratch、child env、timeout/reap、cleanup/leak、ledger、current-run anchorである。

## 実行方法

```bash
bun test \
  tests/integration/t-codex-exec-live-helper.test.ts \
  tests/integration/t-live-e2e-codex.integration.test.ts \
  tests/integration/t-live-e2e-hardening-kit.integration.test.ts \
  tests/integration/t-live-e2e-lifecycle.integration.test.ts \
  tests/integration/t-live-e2e-claude-print.integration.test.ts \
  tests/integration/t-live-e2e-claude-sdk.integration.test.ts \
  tests/integration/t-live-e2e-claude-tui.integration.test.ts \
  tests/integration/t-live-e2e-runbook.test.ts
```

実provider境界が暗黙実行されないことを確認するserial smoke:

```bash
bun test \
  tests/e2e/t-exec-codex-kernel.serial.test.ts \
  tests/e2e/t-claude-print-kernel.serial.test.ts \
  tests/e2e/t-claude-sdk-kernel.serial.test.ts \
  tests/e2e/t-claude-tui-kernel.serial.test.ts
```

## 合格基準

- fake統合はfailure 0件
- serial live境界はopt-in未設定時にpreflight/scratch/modelより前で理由付きSKIP
- success経路は `executed/asserted → cleanup-barrier-closed → ledger-appended|already-present → closure-committed`
- timeout/abort/reap、duplicate terminal、overflow、private `tmux -S`、current-run anchorの負例がgreenにならない

## Test Dataと後始末

各testが独自scratchを所有し、resource registrarまたはadapter cleanupで除去する。default tmux server、user config、user hooks、source auth fileへアクセスしない。
