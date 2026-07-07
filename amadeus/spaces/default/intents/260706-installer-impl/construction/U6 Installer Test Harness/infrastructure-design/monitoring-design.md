# Monitoring Design — U6 Installer Test Harness

> Stage: construction / infrastructure-design  
> Unit: U6 Installer Test Harness

## Observability Scope

U6 has no production monitoring stack. Its observability is test output, GitHub Actions summaries, normalized snapshots, coverage registry reports, ratchet diffs, and fixture diagnostics.

## CI Signals

| Signal | Producer | Purpose |
|---|---|---|
| suite exit code | Bun test runner / scripts | blocking pass/fail |
| subset timing | command wrapper | locate slow unit/integration/smoke/registry subsets |
| fake-port call history | FakePortKit | prove no-write and call ordering |
| temp target summary | TempTargetManager | diagnose mutation and cleanup failures |
| snapshot diff | SnapshotNormalizer | review UX/report changes |
| coverage freshness report | RegistryFreshnessCheck | identify missing/stale FR/US/NFR mappings |
| ratchet diff | CoverageRatchetCheck | detect unintended coverage decreases |
| smoke command record | SmokeCommandRunner | preserve command, cwd, exit, stdout, stderr |

## GitHub Actions Output

PR logs should show concise summaries:

- failing suite/subset name;
- fixture name and scenario name;
- normalized path for temp target failures;
- missing/stale coverage mappings;
- ratchet decrease summary;
- smoke command exit and scrubbed stdout/stderr.

Large details may be uploaded as CI artifacts, but user target contents and secrets must never be uploaded.

## Flake Detection

The harness treats these as failures even when assertions otherwise pass:

- live GitHub/npm call in deterministic suites;
- mutation outside temp root;
- wall-clock timestamp in normalized snapshot;
- absolute host path in snapshot output;
- shared temp target between tests;
- registry mapping to a missing test id.

## Runtime Diagnostics

U6 runtime diagnostics are for maintainers only. They do not change installer runtime behavior and do not become telemetry in `@amadeus-dlc/setup`.

## Upstream Coverage

- `performance-design.md`: subset timing and suite budgets become observable signals.
- `security-design.md`: no live network, no real project mutation, and secret-safe output become monitored failures.
- `scalability-design.md`: mapping/test/snapshot/smoke capacities define summary output boundaries.
- `reliability-design.md`: deterministic evidence, cleanup diagnostics, and flake prevention become observability checks.
- `logical-components.md`: every U6 component produces or consumes diagnostic signals.
- `components.md`: installer runtime components remain test subjects only.
- `services.md`: GitHub Actions PR gates consume these signals.
- `business-logic-model.md`: failure modes and fixture workflow define diagnostic points.
