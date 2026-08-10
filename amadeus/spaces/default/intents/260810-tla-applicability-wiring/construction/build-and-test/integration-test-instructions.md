# Integration Test Instructions — 260810-tla-applicability-wiring

上流入力（consumes 全数）: `code-generation-plan.md`（Step 1〜6 のスライス→テスト対応を消費）、`code-summary.md`（対象コミットと検証実測を消費）

## 対象と実行

新規 6 本（t524〜t529、本 intent で予約・採番）+ ピン 5 本:

```sh
bun test \
  tests/integration/t524-subjects-declare-writer.integration.test.ts \
  tests/integration/t525-requirements-heading-grammar.integration.test.ts \
  tests/integration/t526-advisory-handoff-stage.integration.test.ts \
  tests/integration/t527-terminal-receipt-persist.integration.test.ts \
  tests/integration/t528-authoring-hold-end-to-end.integration.test.ts \
  tests/integration/t529-advisory-hold-trace.integration.test.ts \
  tests/integration/t445-tla-applicability-cli.integration.test.ts \
  tests/integration/t445-advisory-declaration-supply.integration.test.ts \
  tests/integration/t445-stage-frontmatter-compose.integration.test.ts \
  tests/integration/t450-tla-authoring-stage-e2e.integration.test.ts \
  tests/integration/t481-spec-root-resolver.integration.test.ts \
  --timeout=30000
```

- FR 対応: FR-1+D4=t524（io-failure 注入含む）/ FR-2=t525 / FR-3+D2=t526 / FR-4+D3=t527 / FR-5+FR-6=t528（落ちる実証の正負両側）/ FR-7+D5=t529
- ピン維持: t445×3（不在=no-hold・BR-U2-05 供給・`scopes: []`）/ t450（終端経路拒否・composed E2E）/ t481（D4 の明示改訂 1 assert のみ）
- fixture はすべてテスト temp dir。本 repo に `authoring-subjects.json` / evidence store を作らない（FR-5）

## 合否基準

全 pass / 0 fail（実測は build-test-results.md）。t528 の端到端（供給→hold→handoff→run-now 非解除→receipt 解除）が green であること。
