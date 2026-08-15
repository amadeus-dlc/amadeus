# Unit Test Instructions — intent 260814-open-bug-batch-6

> 5 unit(#3032 調査 / #3062 landed / #3026 sensor / #3031 判定 / #3028 docs)は個別 PR で着地済み。要件駆動の対象:

- #3062: `bun test tests/integration/t3062-pr-convergence-landed-finalization.integration.test.ts`
- #3026: `bun test tests/integration/t3026-plugin-sensor-declaration.integration.test.ts`
- #3028: `bun test tests/integration/t3028-sensors-docs-sync.integration.test.ts`
- blocking はリモート CI(各 PR の `ci-success` + 現 main)を正とする(remote-first)
