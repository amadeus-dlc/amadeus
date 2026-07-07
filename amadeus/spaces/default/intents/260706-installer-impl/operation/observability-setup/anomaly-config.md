# Anomaly Configuration — @amadeus-dlc/setup Observability

## Upstream Inputs

- U7 `reliability-design.md`: deterministic failure classes
- U7 `security-design.md`: blocking severity rules
- U7 `performance-design.md`: timeout → failed gate

## Anomaly Detection Scope

ML-based anomaly detection（CloudWatch Anomaly Detection 等）は使用しない。ルールベースの **deterministic anomaly** 検知のみ。

## CI Anomaly Rules

| Rule ID | Condition | Classification |
|---------|-----------|----------------|
| ANO-CI-001 | required gate missing from plan | config drift |
| ANO-CI-002 | gate status `passed` but artifact absent | report contract violation |
| ANO-CI-003 | installer PR skips package gates without `installerRelated:false` | classifier bug |
| ANO-CI-004 | job < 2 min with full gate set pass on large diff | suspicious skip |
| ANO-CI-005 | repeated identical dependency finding after fix | stale cache / lockfile |

## Security Anomalies

| Rule ID | Condition | Action |
|---------|-----------|--------|
| ANO-SEC-001 | new verified secret finding | P0 — block merge |
| ANO-SEC-002 | allowlist entry past `expiresAt` | block — renew or fix |
| ANO-SEC-003 | High finding with `surface:unknown` | block until classified |

## Release Anomalies

| Rule ID | Condition | Action |
|---------|-----------|--------|
| ANO-REL-001 | publish without preflight artifact | workflow bug |
| ANO-REL-002 | post-publish version mismatch | rollback runbook |
| ANO-REL-003 | docs-consistency pass but README has `init` | gate false-positive investigation |

## Baseline Comparison

| Metric | Baseline source | Anomaly if |
|--------|----------------|------------|
| integration coverage keys | `tests/.coverage-ratchet.json` | key removed |
| smoke cases | 2 stable cases | case count changes |
| gate registry count | `GATE_REGISTRY.length` | gate removed without review |

## Response Playbook Link

Security/release anomalies → `incident-response` ステージ + `rollback-runbook.md`
