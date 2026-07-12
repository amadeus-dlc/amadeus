# Alarms

## Applicability

`performance-design.md`、`security-design.md`、`reliability-design.md`、`monitoring-design.md`、`infrastructure-services.md`にSNS/CloudWatch alarm対象はなくN/A。

## Existing signal

collector、writer、git push失敗はGitHub Actions job redとしてloud-failする。通知routingやpaging policyは本Intentで追加しない。

## Escalation

赤いjobはrun logを確認し、NFF上限、rebase conflict、認証、collector defectを分類する。
