# Escalation Matrix

## Basis

`dashboards.md`、`alarms.md`、`reliability-design.md`、`security-design.md`、`deployment-architecture.md`に外部on-call serviceは定義されない。

## Matrix

| Signal | First responder | Escalate when |
|---|---|---|
| Job red | Repository maintainer | 原因不明、再発、権限/認証 |
| Collector/schema defect | Code owner | fix+revert PRが必要 |
| Rebase conflict | Repository maintainer | conflict解消判断が必要 |
| Secret exposure | Security/incident authority | 即時。別の緊急削除手順 |

## Communication

新規SNS/Slack/paging/on-call rotationを生成しない。既存repository PR/run recordを監査証跡とする。
