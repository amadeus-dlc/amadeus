# Feedback Loop — eoc1-gate-check

## 上流入力(consumes 全数)

`../performance-validation/nfr-validation-matrix.md`(全 PASS)、`../observability-setup/slo-config.md`(SLO N/A 根拠)、`../incident-response/runbooks.md`、drift-report.md、`../observability-setup/dashboards.md` / `../observability-setup/alarms.md`(N/A 根拠)、`../deployment-execution/deployment-log.md`(着地4値)、`../performance-validation/load-test-results.md`(代替実測)、`../incident-response/incident-plan.md`。

## ループ

偽陽性/偽陰性の報告 → Issue(bug ラベル規律)→ クロスレビュー2名 → 修正 intent(本日確立の bugfix フロー)。ノルム面の学びは §13/PM ラウンドが回収(E-1101 系で実演済み)。ガード有効性の長期指標 = E-OC1 順序 slip の再発率(PM 確定議題 (a) の監視に合流)。
