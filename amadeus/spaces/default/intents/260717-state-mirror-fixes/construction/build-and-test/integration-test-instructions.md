# Integration Test Instructions — 260717-state-mirror-fixes

上流入力(consumes 全数): code-generation-plan.md、code-summary.md(両 unit — fix-1170-retreat-guard / fix-1172-skip-denominator)

## 対象と実行

| Bolt | テスト | 実行 | 期待 |
|---|---|---|---|
| U1 #1170 | tests/integration/t233-set-status-retreat-guard.integration.test.ts(BR-1/2/3/4/6/8 — 並列 spawn 競合含む) | `bun test tests/integration/t233-...` | 11 pass |
| 全体 | `bash tests/run-tests.sh --ci`(smoke+unit+integration) | 同左 | RESULT: PASS・Failed 0 |

## 並列競合の再現条件

BR-3(set-status ∥ amadeus-state set)は t145 既習様式の CLI 並列 spawn。fanout 直後のフルスイートはホスト負荷収束後に実行(fanout-load-settle-before-integration — code-generation-plan.md fix-1170 の検証列で実測済み)。
