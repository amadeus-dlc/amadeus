# Drift Report — eoc1-gate-check

## 上流入力(consumes 全数)

`../performance-validation/nfr-validation-matrix.md`(全 PASS)、`../observability-setup/slo-config.md`(SLO N/A 根拠)、`../incident-response/runbooks.md`、cost-analysis.md、`../observability-setup/dashboards.md` / `../observability-setup/alarms.md`(N/A 根拠)、`../deployment-execution/deployment-log.md`(着地4値)、`../performance-validation/load-test-results.md`(代替実測)、`../incident-response/incident-plan.md`。

## ドリフト面

(1) questions 様式の将来変化 → format-currency-grep ノルム(本 intent 起点で persist 済み)が RE 段で検知 (2) 8コピー同期 → 既存 dist:check/promote:self:check が強制 (3) cutoff(260716)は恒久固定 — pre-guard intent が全て完了/退役した後も無害(enforcement 対象が自然に全数へ収束)。
