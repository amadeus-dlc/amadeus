# Smoke Test Results — eoc1-gate-check

## 上流入力(consumes 全数)

`../deployment-pipeline/deployment-strategy.md`(main 即時有効)、`../environment-provisioning/validation-report.md`(4値)、`../deployment-pipeline/rollback-runbook.md`、deployment-log.md、`../deployment-pipeline/cd-config.md`(CD なし既定)、`../environment-provisioning/environment-inventory.md`、`../../construction/build-and-test/build-test-results.md`(fresh 実測表)。

## 実測

- bolt worktree: `bash tests/run-tests.sh --smoke` RESULT: PASS(B&T 記録)
- 着地後の実動作 smoke(本 conductor ツリー = ミラー先行適用): dogfooding 5回(CG/B&T/CP/DPL/EP の gate-start が新ガード通過 — 監査 emit 実測)
