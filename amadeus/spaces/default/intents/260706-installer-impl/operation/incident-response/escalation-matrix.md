# Escalation Matrix — @amadeus-dlc/setup

## Upstream Inputs

- `alarms.md`: ALM-* severity
- U7 `security-design.md`: P0 secret policy
- U8 `deployment-architecture.md`: protected publish boundary

## Team Model

| Role | Person | Coverage |
|------|--------|----------|
| Primary maintainer | project owner | business hours + best-effort |
| Backup | — | undefined（solo） |
| External | npm support | publish/unpublish policy only |

## Escalation Paths

| Severity | Initial responder | Escalation | Time to escalate |
|----------|------------------|------------|------------------|
| P0 | maintainer | npm support（unpublish 判断時） | 30 min if blocked |
| P1 | maintainer | — | 4h if unresolved |
| P2 | maintainer | — | next business day |
| P3 | maintainer | — | backlog |

## Contact Channels

| Channel | Use |
|---------|-----|
| GitHub Issues | incident tracking |
| GitHub PR comments | CI failure coordination |
| npm deprecate message | user-visible mitigation |

## Alarm → Runbook Routing

| Alarm | Runbook | Severity |
|-------|---------|----------|
| ALM-CI-001/002 | RB-001 | P1 |
| ALM-SEC-001 | RB-002 | P1 |
| ALM-SEC-002 | RB-003 | P0 |
| ALM-REL-001 | RB-005 | P1 |
| ALM-REL-003 | RB-004 | P0 |

## On-Call

**No formal on-call rotation.** P0 events rely on maintainer availability. GitHub notification emails enabled推奨。

## External Escalation

| Vendor | When | Contact |
|--------|------|---------|
| npm | unpublish policy、registry outage | support.npmjs.com |
| GitHub | Actions platform outage | githubstatus.com |

## Post-Escalation

All P0/P1 incidents require GitHub Issue with:

- timeline
- root cause
- preventive action item
