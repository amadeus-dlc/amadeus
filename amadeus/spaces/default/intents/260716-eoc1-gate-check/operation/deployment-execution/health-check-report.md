# Health Check Report — eoc1-gate-check

## 上流入力(consumes 全数)

`../deployment-pipeline/deployment-strategy.md`(main 即時有効)、`../environment-provisioning/validation-report.md`(4値)、`../deployment-pipeline/rollback-runbook.md`、deployment-log.md、smoke-test-results.md、`../deployment-pipeline/cd-config.md`(CD なし既定)、`../environment-provisioning/environment-inventory.md`、`../../construction/build-and-test/build-test-results.md`(fresh 実測表)。

## 判定

main 着地後の各 worktree での健全性 = gate-start の正常通過(dogfooding 5回 + e1/e2/e3 の以後の gate-start が実運用ヘルスチェックを兼ねる — 偽陽性ブロック発生時は rollback-runbook の revert 手順)。ランタイムサービス不在につき常駐ヘルスメトリクスは N/A(根拠: CLI ツール — observability:c3 系)。
