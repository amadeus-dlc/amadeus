# Log Queries

## Applicability

`performance-design.md`、`security-design.md`、`reliability-design.md`、`monitoring-design.md`、`infrastructure-services.md`にCloudWatch Logs groupはなく、Logs Insights queryはN/A。

## Existing diagnostics

GitHub Actions run logでcollector名、push分類、rebase conflictを確認する。secretやPIIを新規出力しない。

## Retention

GitHub既存retention設定を変更しない。新規log storeやaggregationを作成しない。
