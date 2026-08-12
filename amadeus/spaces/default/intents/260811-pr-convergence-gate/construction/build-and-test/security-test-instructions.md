# Security Test Instructions

入力は `code-generation-plan.md` と `code-summary.md`。対象 NFR は report integrity、fail-closed reliability、CLI/audit trust boundary であり、Web/認証/DB/IaC 面は存在しない。

## 実行

```bash
bun test --timeout 120000 \
  tests/unit/t534-pr-convergence-report-attestation.test.ts \
  tests/integration/t534-pr-convergence-mandatory-lifecycle.integration.test.ts \
  tests/integration/t92.test.ts \
  tests/integration/t-sensor-fire-hardening.test.ts
```

## 成功条件と対象脅威

- tamper/copy/replay、別 Intent/Unit/PR/head、unlinked self scope、stale/never-fired sensor を fail closed に拒否する。
- subprocess は argv 配列で起動し、credential や stderr 本文を永続化しない。
- DAST、auth scan、IaC scan は該当 surface がないため非適用。依存関係や secret の新規追加はない。
