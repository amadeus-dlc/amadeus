# Tracing Configuration — @amadeus-dlc/setup

## Upstream Inputs

- U7 `monitoring-design.md`: observability scope（no runtime telemetry）
- U7 `performance-design.md`: per-gate duration measurement
- U7 `infrastructure-services.md`: gate execution boundaries

## Tracing Strategy

**Distributed tracing: Not Applicable**

| Reason | Detail |
|--------|--------|
| CLI lifecycle | single-process、short-lived |
| No HTTP service | installer は batch CLI |
| CI model | job/step boundaries で十分 |

## Correlation IDs

| Boundary | Correlation key | Purpose |
|----------|----------------|---------|
| PR CI run | `github.run_id` | gate reports を run に紐付け |
| Release dispatch | `github.run_id` + `selected_tag` | release artifacts を tag に紐付け |
| Gate report | `gate-summary.json` → `changeSet.sha` | changed files と gate 結果 |

## Job-Level Span Equivalent

GitHub Actions job graph が trace tree に相当:

```
check job
├── setup bun
├── typecheck
├── lint
├── dist:check
├── promote:self:check
└── tests

installer-gates job
├── change-detector
└── run-installer-gates
    ├── package-metadata
    ├── installer-smoke
    └── ...
```

## Duration Tracking

`performance-design.md` に従い、各 gate script は GHA step timing を primary duration signal とする。将来 enhancement: gate JSON に `durationMs` フィールド追加（v2）。

## End-User Install Trace

v1 では OpenTelemetry 等は導入しない。manifest `.amadeus/setup-manifest.json` が installed version / harness の post-hoc trace に相当。
