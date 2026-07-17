# Escalation Matrix — eoc1-gate-check

## 上流入力(consumes 全数)

`../deployment-pipeline/rollback-runbook.md`(revert 手順)、`../observability-setup/observability-setup-questions.md`(観測 = 監査行)、`../../construction/eoc1-gate-guard/nfr-design/security-design.md`、incident-plan.md、`../observability-setup/dashboards.md`(N/A 根拠)、`../observability-setup/alarms.md`(N/A 根拠)、`../../construction/eoc1-gate-guard/infrastructure-design/deployment-architecture.md`(revert 前提)。

| 事象 | 一次対応 | エスカレーション |
|------|---------|----------------|
| 偽陽性拒否(単発) | conductor が是正手順で自己解決 | 再発なら Issue 起票 → leader |
| 偽陽性拒否(構造的) | Issue P1 + revert PR | leader → ユーザー(仕様変更該当時は正準リスト(4)) |
| 検査の無音不発(fail-open) | 検証劇場 Forbidden 違反として即 Issue P0 | leader → ユーザー |
