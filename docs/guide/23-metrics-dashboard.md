# Metrics Dashboard

> Languages: **English** | [日本語](23-metrics-dashboard.ja.md)

The repository records a code-health snapshot (`metrics/*.json`) on every
merge to `main` (see the `metrics-snapshot` job in `.github/workflows/ci.yml`).
The metrics dashboard renders that time series into a single self-contained
HTML page so trends — coverage drops, complexity growth, dist bloat — are
visible at a glance.

## Viewing

Open `metrics/index.html` in a browser. The file is committed and regenerated
by CI on every snapshot, so the checked-out copy is always current. No server
or network access is needed: charts are inline SVG with zero dependencies.

- One section per collector (`ccn`, `coverage`, `loc`, `tests`,
  `test_pyramid`, `dist_size`), one line chart per value key.
- Hover a data point to see its `captured_at` timestamp and commit SHA
  (12 chars); the collapsible value table below each chart carries the same
  columns for non-hover use.
- Red highlights mark a regression against the previous snapshot: CCN
  violations up, coverage down, test failures non-zero, dist size up.

## Commands

```bash
bun scripts/metrics-visualize.ts --write   # regenerate metrics/index.html
bun scripts/metrics-visualize.ts --check   # verify the committed page matches a fresh render
```

Both commands are fail-closed: any structurally invalid snapshot, an empty
`metrics/` directory, or a render above the size ceiling aborts with a
non-zero exit and no write. Output is deterministic — the same snapshot set
always renders to the same bytes, which is what makes `--check` meaningful.

## Related tooling

The dashboard is the rendering half of the metrics subsystem. Snapshots are
written by `scripts/metrics-snapshot.ts`, pruned by
`scripts/metrics-retention.ts` (newest 360 kept), and readable as plain-text
tables via `bun scripts/metrics-timeseries.ts`. All four share one validated
parser, so they agree on what a valid snapshot is.
