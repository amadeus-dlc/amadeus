# Dashboards

## Applicability

`performance-design.md`、`security-design.md`、`reliability-design.md`、`monitoring-design.md`、`infrastructure-services.md`にruntime/cloud dashboard対象はないためCloudWatch dashboardはN/A。

## Existing view

GitHub Actions run historyをjob health view、`metrics/*.json`を時系列観測台帳として使う。外部dashboardは生成しない。

## Pending

landing後、main run、bot author、queue挙動を実測して閉包する。
