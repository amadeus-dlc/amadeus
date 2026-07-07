# Performance Validation — Clarifying Questions

## Q1: 想定トラフィックパターンは？

**Answer**: HTTP トラフィックなし。負荷パターンは:

- **CI**: installer-related PR で full gate set（burst: PR open）
- **CLI**: 単一 maintainer の install/upgrade（steady、低頻度）
- **Release**: manual dispatch（rare burst）

## Q2: 目標レイテンシ（p50/p95/p99）は？

**Answer**: U4 `performance-requirements.md`（planning p95）と U7 `performance-requirements.md`（CI gate p95 <= 20 min）が SSOT。

## Q3: スループット要件は？

**Answer**: concurrent users スループットではなく、**単一 plan の file count 上限**（U4: 2,000 files）と **CI workflow 完了時間**。

## Q4: ボトルネック候補は？

**Answer**: installer-smoke/integration gate、archive fetch（runtime）、GitHub Actions cold start。

## Upstream References

- U4/U7 `performance-requirements.md`
- U4/U7 `scalability-requirements.md` / `scalability-design.md`
- U4/U7 `performance-design.md`
- `dashboards.md`: CI duration SLI
