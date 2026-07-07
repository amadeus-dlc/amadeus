# Alarms — @amadeus-dlc/setup Observability

## Upstream Inputs

- U7 `reliability-design.md`: failure handling、blocking conditions
- U7 `security-design.md`: dependency/secret blocking rules
- U7 `monitoring-design.md`: failure diagnostics

## Alarm Model

GitHub Actions **check failure** が primary alarm。追加の CloudWatch/PagerDuty alarm はプロビジョニングしない。

## Merge-Blocking Alarms (PR)

| Alarm ID | Trigger | Severity | Action |
|----------|---------|----------|--------|
| ALM-CI-001 | `check` job failure | P1 | PR merge block、fix + push |
| ALM-CI-002 | installer-gates blocking failure | P1 | inspect `gate-summary.json` |
| ALM-SEC-001 | dependency-audit High/Critical reachable | P1 | fix dep or allowlist with expiry |
| ALM-SEC-002 | secret-scan verified finding | P0 | rotate secret、remove from history |
| ALM-PKG-001 | package-dry-run unexpected file | P1 | fix `files` allowlist |
| ALM-COV-001 | coverage ratchet decrease | P2 | update tests + ratchet intentionally |

## Release Alarms (workflow_dispatch)

| Alarm ID | Trigger | Severity | Action |
|----------|---------|----------|--------|
| ALM-REL-001 | release-preflight gate failure | P1 | fix before publish attempt |
| ALM-REL-002 | publish-validation failure | P1 | version/tag/confirm fix |
| ALM-REL-003 | publish job failure | P0 | `rollback-runbook.md` |
| ALM-REL-004 | post-publish verification failure | P1 | deprecate + patch per runbook |

## Notification Channels

| Channel | When |
|---------|------|
| GitHub PR review / checks UI | PR gate failure |
| GitHub Actions email (user pref) | workflow failure |
| Maintainer manual review | release dispatch |

## Alarm Suppression

| Condition | Behavior |
|-----------|----------|
| non-installer PR | package-specific alarms suppressed (skip) |
| valid vulnerability allowlist | `passed-with-exception` — visible、not blocking |
| dry_run:true release | publish alarms not armed |

## Escalation

solo maintainer モデルのため escalation path は self-serve。P0（secret leak / bad publish）は即時 dist-tag rollback + secret rotation（`rollback-runbook.md`）。
