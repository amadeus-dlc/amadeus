# Feedback Optimization — Clarifying Questions

## Q1: SLO は達成されているか？エラーバジェットの burn rate は？

**Answer**: L2 local SLO は達成。L3 GHA p95 baseline は未計測のため error budget は **not started**（`slo-report.md`）。

## Q2: コスト最適化の余地は？

**Answer**: AWS コストなし。GitHub Actions minutes が主コスト（`cost-analysis.md`）。

## Q3: 設定 / インフラ drift はあるか？

**Answer**: dist/self-install drift guard は CI で監視。未コミット `packages/setup/` ファイルが多数 — git staging drift（`drift-report.md`）。

## Q4: ユーザーフィードバックから見える改善点は？

**Answer**: v1 未リリースのため本番フィードバックなし。設計上の改善候補は `feedback-loop.md`。

## Q5: 自動化できる運用 toil は？

**Answer**: E3 手動プロビジョニング、初回 GHA dry-run dispatch、git staging。

## Upstream References

- `dashboards.md` / `alarms.md` / `slo-config.md`
- `deployment-log.md`
- `load-test-results.md`
- `incident-plan.md`
