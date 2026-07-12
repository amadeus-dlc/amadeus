# Refined Mockups — metrics-observation(出力契約の精緻化)

> rough-mockups の正準部分(verdict 3分岐・exit code・アトミック書き込み)を維持し、FR-1〜FR-5 確定を反映して精緻化。requirements 段の product-lead 申し送り(モック例への test_pyramid 追補)を本書で解消。スキーマの最終確定は design(application/functional-design)。

## snapshot ファイル(FR-1 の6 collector 反映版・例示)

```json
{
  "schema_version": 1,
  "captured_at": "2026-07-12T06:05:00Z",
  "commit": "5d6a41c2a…(フル SHA)",
  "collectors": {
    "ccn":          { "tool": "lizard", "tool_version": "1.23.0", "functions": 2140, "over_threshold": 42, "distribution": { "p50": 3, "p90": 9, "max": 39 } },
    "coverage":     { "tool": "bun-lcov+coverage-normalize", "tool_version": "(runner rev)", "line_pct": 51.41, "hits": 9550, "lines": 18573 },
    "loc":          { "tool": "git+static-scan", "tool_version": "(tool rev)", "ts_files": { "core": 210, "scripts": 30, "tests": 242 }, "total_lines": 118000 },
    "tests":        { "tool": "run-tests tests-totals.json", "tool_version": "(runner rev)", "files": 396, "assertions": 4413 },
    "test_pyramid": { "tool": "test-size classifier", "tool_version": "(rev)", "tiers": { "smoke": {"M": 13}, "unit": {"S": 37, "M": 161, "L": 1}, "integration": {"S": 9, "M": 105}, "e2e": {"S": 3, "M": 63, "L": 2} } },
    "dist_size":    { "tool": "dir-walk", "tool_version": "(rev)", "bytes": 12582912 }
  }
}
```

## CLI 出力(verdict 別 — rough の正準部分を継承)

```
$ bun <tool> --write
METRICS SNAPSHOT OK — 6 collectors, written to metrics/2026-07-12T06-05-00Z.json

$ bun <tool> --write   # collector 失敗時
METRICS SNAPSHOT FAILED [COLLECTOR: ccn] — lizard exited 127. No snapshot written.

$ bun <tool> --check
METRICS SNAPSHOT CHECK OK — all 6 collectors executable (dry-run, nothing written)
```
