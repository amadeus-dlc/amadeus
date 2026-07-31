# Performance Test Instructions — open-bug-batch

Upstream: `construction/*/code-generation/code-summary.md`. Strategy: Comprehensive.

## Applicability

No unit in this batch introduces a latency/throughput NFR. Performance verification is the repository's existing benchmark harness, kept green per PR.

## Commands

```sh
bun scripts/mirror-distribution-benchmark.ts           # mirror distribution benchmark
bun scripts/mirror-distribution-benchmark-aggregate.ts # aggregate
bun run test:ci                                        # includes benchmark gates in CI jobs
```

## Expectations

- CI benchmark jobs (distribution benchmark, ordered AND gate) succeed on every PR head — recorded per unit in each `code-summary.md` (e.g. issue-1662: benchmark + drift jobs SUCCESS)
- Complexity gate (`bun tests/complexity-gate.ts --check`) is the regression floor for hot paths in the deterministic engine: 0 new violations / 0 regressions

## Regression detection

- A unit that touches engine hot paths (`amadeus-orchestrate.ts`, hooks) must keep the benchmark jobs green on its PR; a failure there blocks merge regardless of local pass counts
