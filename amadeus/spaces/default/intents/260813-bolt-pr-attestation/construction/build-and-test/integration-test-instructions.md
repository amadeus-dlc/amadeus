# Integration Test Instructions

## 対象

`code-generation-plan.md` と `code-summary.md` に記録したruntime、CLI、sensor、completion guard、配布面の境界を検証する。

## 実行

```sh
bun test --timeout 120000 \
  tests/integration/t449-pr-convergence-packaging-e2e.integration.test.ts \
  tests/integration/t533-pr-convergence-enforcement.integration.test.ts \
  tests/integration/t534-pr-convergence-mandatory-lifecycle.integration.test.ts
```

## 成功条件

1U/1B、2U/1B、2U/2B、owner別証跡、full autonomy再開、standalone stage directory除外、partial/stale/copied/replayed evidence拒否がすべて成功すること。
