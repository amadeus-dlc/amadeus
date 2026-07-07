# Monitoring Design — U1 Setup Package Shell

> Stage: construction / infrastructure-design  
> Unit: U1 Setup Package Shell

## Observability Model

U1 has no long-running service metrics, tracing, log aggregation, dashboards, or runtime alerts. Monitoring is test/CI evidence plus stable CLI diagnostics.

## Signals

| Signal | Source | Purpose |
|---|---|---|
| help snapshot | U6 smoke/snapshot tests | detect help/docs drift |
| parser error fixtures | U6 unit tests | detect command grammar regression |
| wrapper Bun-required smoke | U6 smoke tests | detect runtime delegation regression |
| package metadata report | U7 package-metadata gate | detect package boundary regression |
| package dry-run report | U7/U8 package dry-run | detect unwanted publish contents |
| release dry-run summary | U8 manual workflow | validate release path before publish |

## Logging And Diagnostics

U1 CLI output keeps stdout/stderr separation stable. User errors should be classified and omit stack traces. Unexpected top-level failures may include a classified fallback but must not dump full environment variables or secrets.

CI reports should include:

- command invoked;
- exit code;
- stdout/stderr;
- package metadata validation result;
- package dry-run unexpected files when present.

## Alerts And Incident Response

No production alerts are needed for U1. Failures surface as CI check failures or user CLI exits. Maintainer response is:

1. inspect U7/U8 artifact;
2. fix parser/help/package metadata or package files;
3. rerun CI/release dry-run.

## Upstream Coverage

- `performance-design.md`: timing smoke tests are monitoring signals for startup regressions.
- `security-design.md`: secret-safe diagnostics and package contents reports define safe observability.
- `scalability-design.md`: snapshot and package report growth stays bounded.
- `reliability-design.md`: classified exits and no-write fixtures define actionable diagnostics.
- `logical-components.md`: help/error renderers and package metadata checker define monitored components.
- `components.md`: Reporter and Package Check boundaries feed CI evidence.
- `services.md`: GitHub Actions PR gates and manual release workflow are observability surfaces.
- `business-logic-model.md`: Help, parse error, and delegation workflows define signal points.
