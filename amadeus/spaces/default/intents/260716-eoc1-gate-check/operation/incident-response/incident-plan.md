# Incident Plan — eoc1-gate-check

## 上流入力(consumes 全数)

`../deployment-pipeline/rollback-runbook.md`(revert 手順)、`../observability-setup/observability-setup-questions.md`(観測 = 監査行)、`../../construction/eoc1-gate-guard/nfr-design/security-design.md`、runbooks.md、`../observability-setup/dashboards.md`(N/A 根拠)、`../observability-setup/alarms.md`(N/A 根拠)、`../../construction/eoc1-gate-guard/infrastructure-design/deployment-architecture.md`(revert 前提)。

## 計画

P1/P2(全 gate-start 停止級)= 即 revert+Issue+ポストインシデント(PM ラウンドが担う — 既存運用)。P3 以下 = 通常バグフロー。オンコール・即時通知基盤は N/A(根拠: チームは agmsg 常時接続で leader 台帳が検知面 — incident-response:c3)。
