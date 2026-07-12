# Incident Response Questions

## 確定回答

- Failure modes: collector/writer失敗、NFF上限、rebase conflict、認証、誤snapshot。
- Escalation: GitHub Actions run確認→repository maintainer→通常PR修正。
- Automated remediation: NFF限定3回retryのみ。
- Communication/on-call: 本Intentで新規rotation/channelなし。
- RTO/RPO: runtime service不存在のためN/A。

## 上流

`dashboards.md`、`alarms.md`、`reliability-design.md`、`security-design.md`、`deployment-architecture.md`を根拠とする。

## N/A

AWS Incident Manager、SSM Automation、AWS Backup、SNS pagingは対象resource不存在のため生成・操作しない。
