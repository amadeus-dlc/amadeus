# Tracing Configuration

## Applicability

`performance-design.md`、`security-design.md`、`reliability-design.md`、`monitoring-design.md`、`infrastructure-services.md`にdistributed runtime/service callはなく、X-Ray/OpenTelemetry tracingはN/A。

## Correlation

Git commit SHA、workflow run、snapshotの`commit`/`captured_at`を相関キーとして使う。trace IDを新設しない。

## External changes

Tracing resource、agent、collectorの作成・変更は実施しない。
