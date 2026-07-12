# Incident Plan

## Scope

`dashboards.md`、`alarms.md`、`reliability-design.md`、`security-design.md`、`deployment-architecture.md`を対象とし、GitHub Actions job redまたは誤snapshotをincident signalとする。

## Response

Detect（run history）→Triage（collector/writer/git）→Contain（追加push停止）→Recover（通常PR fix/revert）→Verify（quality gates/main run）→Record（PR/run link）の順で対応する。

## Severity

- High: secret/機微情報混入。通常revert以外の緊急削除手順へ即時escalate。
- Medium: schema/collector defect、誤snapshot。
- Low: 一時的NFF/queue delay。

## N/A

Runtime outage、traffic failover、database recovery、AWS Incident Managerは対象不存在のためN/A。
