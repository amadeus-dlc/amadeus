# Dashboards — @amadeus-dlc/setup Observability

## Upstream Inputs

- U7 `monitoring-design.md`: gate signals、GitHub Actions summary
- U7 `infrastructure-services.md`: Gate Reporting Service
- U7 `reliability-design.md`: report contract、U8 handoff status

## Dashboard Inventory

CLI パッケージに runtime dashboard はない。以下が運用ダッシュボードに相当する。

| Dashboard | Location | Audience |
|-----------|----------|----------|
| PR CI status | GitHub PR checks (`check` + `installer-gates`) | contributor |
| Gate detail | `.amadeus-ci/setup/gate-summary.json` artifact | maintainer |
| Release run | GitHub Actions `Release Setup Package` run page | maintainer |
| Release artifacts | `release-setup-reports` artifact | maintainer |

## PR CI Dashboard (GitHub Checks)

| Check | Source job | Key signal |
|-------|-----------|------------|
| typecheck · lint · drift · tests | `ci.yml` / `check` | merge blocking |
| installer / package-metadata | `installer-gates` | publish safety |
| installer / smoke | `installer-gates` | CLI entrypoint |
| installer / integration | `installer-gates` | harness scenarios |
| installer / dependency-audit | `installer-gates` | supply chain |
| installer / secret-scan | `installer-gates` | credential leak |

## Gate Summary Dashboard (JSON)

`gate-summary.json` フィールド（maintainer view）:

```json
{
  "installerRelated": true,
  "gates": [{ "name": "package-metadata", "status": "passed" }],
  "blockingFailures": [],
  "u8Handoff": "ready"
}
```

## Release Workflow Dashboard

`release-setup.yml` run の Step Summary（`release-summary` job）:

- selected tag / distribution version
- dry_run flag
- publish job result
- post-publish job result

## Non-Installer PR View

`installerRelated: false` 時:

- package-specific gates: `skipped`
- global `check` job: 依然として required
- summary reason: `"PR is not installer-related"`
