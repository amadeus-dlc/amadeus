# Observability Setup — Clarifying Questions

## Q1: 監視対象のランタイムは？

**Answer**: `@amadeus-dlc/setup` は long-running service ではない。監視対象は **CI/CD gate signals** と **release workflow artifacts**（U7 `monitoring-design.md`）。

## Q2: ダッシュボード基盤は？

**Answer**: CloudWatch ではなく **GitHub Actions UI** + `.amadeus-ci/setup/*.json` artifact がダッシュボード相当。

## Q3: SLO / アラームの通知先は？

**Answer**: PR check failure（GitHub UI）+ optional maintainer review。PagerDuty / SNS は本 intent スコープ外（solo maintainer）。

## Q4: 分散トレーシングは必要か？

**Answer**: 不要。CLI は単一プロセス。release workflow は job-level ログで十分。

## Upstream References

- U7 `performance-design.md`: per-gate p95 budget
- U7 `security-design.md`: secret-safe reporting
- U7 `reliability-design.md`: GateResult status contract
- U7 `monitoring-design.md`: gate signals、GitHub summary
- U7 `infrastructure-services.md`: Gate Reporting Service
