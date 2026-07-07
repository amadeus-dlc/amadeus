# SLO Report — @amadeus-dlc/setup

## Upstream Inputs

- `slo-config.md`: SLO-CI-001〜003、SLO-REL-001、SLO-CLI-001
- `dashboards.md`: SLI 観測点
- `load-test-results.md`: L2/L3 測定結果
- `deployment-log.md`: local validation 完了

**Report period**: 2026-07-06 — 2026-07-07（initial baseline）  
**Generated**: 2026-07-07T15:28:00Z

## SLO Compliance Summary

| SLO ID | Objective | Actual | Status |
|--------|-----------|--------|--------|
| SLO-CI-001 | 99% CI < 20 min | no GHA samples | **no data** |
| SLO-CI-002 | 95% installer-gates < 20 min p95 | no GHA samples | no data |
| SLO-CI-003 | 100% required gates on installer PR | 122 unit + t209 pass | **pass** |
| SLO-REL-001 | 95% dry-run < 30 min | not dispatched | no data |
| SLO-CLI-001 | 100% smoke pass before release | 2/2 pass | **pass** |

## Error Budget

| SLO | Budget | Consumed | Remaining |
|-----|--------|----------|-----------|
| SLO-CI-001 | 1%/month | 0% | 100% |
| SLO-CI-003 | 0 failures | 0 | intact |

## SLI Detail

| SLI | Value | Source |
|-----|-------|--------|
| Unit pass rate | 100%（122/122） | build-test-results |
| Smoke pass rate | 100%（2/2） | deployment-execution |
| Integration pass rate | 100%（6/6） | deployment-execution |
| Local suite duration | ~229ms | load-test-results |
| U8 handoff ready | design OK | gate registry + ci.yml |

## Recommendations

1. 初回 merge 後 30 日で SLO-CI-001 baseline を確立
2. 初回 `release-setup` dry-run で SLO-REL-001 を計測
3. SLO breach 時は `incident-plan.md` triage を適用

## Trend

初回レポート — trend なし。次回 Ideation サイクルで更新。
