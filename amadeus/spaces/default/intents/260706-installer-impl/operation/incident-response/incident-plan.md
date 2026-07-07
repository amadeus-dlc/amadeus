# Incident Response Plan — @amadeus-dlc/setup

## Upstream Inputs

- `alarms.md`: severity 分類
- U7 `security-design.md`: P0 secret handling
- U8 `deployment-architecture.md`: publish state machine
- `dashboards.md`: incident 調査の起点

## Incident Classification

| Class | Examples | Default severity |
|-------|----------|-----------------|
| CI | gate failure、coverage ratchet | P1–P2 |
| Security | verified secret、dependency High | P0–P1 |
| Release | bad publish、post-publish fail | P0–P1 |
| Support | user install/upgrade confusion | P2–P3 |

## Response Phases

### 1. Detect

- Automated: GitHub check failure（`alarms.md` ALM-*）
- Manual: user report、maintainer notice

### 2. Triage (15 min)

| Question | Action |
|----------|--------|
| Registry affected? | → Release class、P0 |
| Secret involved? | → Security class、P0 |
| Merge only blocked? | → CI class、P1 |
| User-only impact? | → Support class、P2 |

### 3. Mitigate

- CI: fix + push（`runbooks.md` RB-001）
- Security: rotate + remove（RB-003）
- Release: dist-tag rollback（RB-004）
- Support: guided resolution（RB-006）

### 4. Resolve

- Verify green CI / successful dry-run dispatch
- Document in GitHub Issue（timeline + root cause + follow-up）

### 5. Post-Incident

- Update allowlist / tests / docs if needed
- Feed learnings to `feedback-optimization` feedback-loop

## Communication Template

```markdown
## Incident: <title>
- **Status**: investigating | mitigated | resolved
- **Severity**: P0–P3
- **Impact**: <who affected>
- **Mitigation**: <action taken>
- **Next update**: <time> or resolved
```

## RTO Targets

| Class | Target RTO |
|-------|-----------|
| P0 Security/Release | 1h mitigation |
| P1 CI | 4h |
| P2 Support | 1 business day |

## Tools

- GitHub Actions logs + artifacts
- Local maintainer scripts
- `rollback-runbook.md`
- **Not used**: AWS Incident Manager、SSM Automation（N/A for npm CLI）

## Disaster Recovery

- Source of truth: git `main` branch
- Package recovery: republish from tagged release
- No multi-region failover（single npm package）
