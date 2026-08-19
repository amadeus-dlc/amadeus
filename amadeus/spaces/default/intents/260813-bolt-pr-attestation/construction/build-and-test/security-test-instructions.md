# Security Test Instructions

## 対象

`code-generation-plan.md` と `code-summary.md` のfail-closed要件を対象に、Intent/Bolt/Unitのすり替え、report改ざん、receipt copy/replay、stale head、foreign ownerを検証する。

## 実行

```sh
bun test --timeout 120000 \
  tests/unit/t534-pr-convergence-report-attestation.test.ts \
  tests/integration/t533-pr-convergence-enforcement.integration.test.ts \
  tests/integration/t534-pr-convergence-mandatory-lifecycle.integration.test.ts
```

## 成功条件

すべての不正入力がGitHub mutationまたはstage completionより前に拒否され、unlinked bypassがself scopeで許可されないこと。
