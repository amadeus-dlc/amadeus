# SLO Configuration — @amadeus-dlc/setup

## Upstream Inputs

- U7 `performance-design.md`: gate group budgets、p95 <= 20 min
- U7 `reliability-design.md`: determinism over speed
- U7 `monitoring-design.md`: observable signals

## Service Level Objectives

| SLO ID | Service | Objective | Measurement window |
|--------|---------|-----------|-------------------|
| SLO-CI-001 | PR `check` job | 99% runs complete < 20 min | 30-day rolling |
| SLO-CI-002 | installer-gates (when required) | 95% complete < 20 min p95 | 30-day rolling |
| SLO-CI-003 | Gate correctness | 100% required gates executed on installer PR | per PR |
| SLO-REL-001 | release dry-run | 95% preflight complete < 30 min | per dispatch |
| SLO-CLI-001 | local smoke | 100% pass on main before release dispatch | per release |

## SLIs (Service Level Indicators)

| SLI | Source | Formula |
|-----|--------|---------|
| CI duration | GHA job timing | wall clock per job |
| Gate pass rate | `gate-summary.json` | passed / required gates |
| Smoke pass rate | `smoke.json` | passed cases / total |
| Integration pass rate | `integration.json` | passed cases / total |
| U8 handoff ready | gate summary | `u8Handoff == ready` |

## Error Budget

| SLO | Budget | Burn trigger |
|-----|--------|--------------|
| SLO-CI-001 | 1% runs > 20 min / month | investigate parallelization / cache |
| SLO-CI-003 | 0 failures tolerated | gate registry bug — hotfix |

Correct pass/fail classification は latency より優先（`performance-design.md` Non-Goals 逆説）。

## Release SLO Notes

- npm registry availabilityは npm 側 SLO（out of scope）
- publish success SLO は E3 プロビジョニング後に初回 baseline 取得

## Review Cadence

- Monthly: GHA workflow duration trend
- Per release: smoke + integration re-run before dispatch
