# Performance Test Instructions — 260727-solo-election

## Scope

U1-PERF-01: `tally()` remains a pure function with zero new imports. No runtime performance regression expected.

## Verification

`tally()` is exercised in t234 unit tests (in-process, sub-millisecond). No separate load test warranted for this intent.

```bash
bun test tests/unit/t234-election-model.test.ts
```

## NFR Reference

- `construction/solo-election-core/nfr-requirements/performance-requirements.md` U1-PERF-01

## Upstream References

- `construction/solo-election-core/code-generation/code-summary.md`
