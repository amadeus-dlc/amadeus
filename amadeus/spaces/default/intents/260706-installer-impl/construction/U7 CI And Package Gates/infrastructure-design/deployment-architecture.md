# Deployment Architecture — U7 CI And Package Gates

> Stage: construction / infrastructure-design  
> Unit: U7 CI And Package Gates

## Architecture Summary

U7 deploys no application runtime. It defines GitHub Actions PR gate infrastructure and repository-local maintainer scripts for installer-related changes. The output is a deterministic `GatePlan`, per-gate `GateResult` artifacts, and a GitHub Actions summary that blocks merge when required gates fail.

U7 success means `U8 handoff ready`, not release-ready, published, or released.

## CI Topology

| Layer | Deployment surface | Notes |
|---|---|---|
| GitHub Actions workflow | PR check runner | stable check names under `installer / ...` |
| Bun setup/cache | CI job setup | shared by package/test/security/drift gates |
| `InstallerChangeDetector` | repository script | reads changed files and writes `.amadeus-ci/setup/change-set.json` |
| `GateRegistry` / `GatePlanner` | repository script/data | maps gate names to command/check/artifact/dependency/path condition |
| gate scripts | repository scripts and U6 commands | run metadata, dry-run, tests, coverage, drift, security checks |
| scanner-producing steps | CI adapters | write normalized findings JSON before `SecurityGate` |
| `GateReporter` | repository script | writes JSON artifacts and GitHub Actions summary |

## Environment Definitions

| Environment | Purpose |
|---|---|
| local developer | run gate scripts and inspect `.amadeus-ci/setup/` reports |
| GitHub Actions PR | execute installer-related blocking gates |
| U8 release workflow preflight | rerun U7 gates before release-specific validation |

There are no npm publish credentials, protected release environments, tag creation permissions, or GitHub Release creation permissions in U7.

## Artifact Layout

U7 writes bounded reports under `.amadeus-ci/setup/`:

- `change-set.json`;
- package metadata and dry-run reports;
- smoke/integration/coverage reports from U6 command surfaces;
- normalized dependency/secret findings;
- security gate reports;
- gate summary and U8 handoff status.

Large details stay in JSON artifacts; GitHub Actions summary shows counts, blocking ids, failed check names, and artifact paths.

## Upstream Coverage

- `performance-design.md`: topology supports parallel gates, bounded artifacts, and per-gate timing.
- `security-design.md`: no token/no publish boundary and normalized findings shape the CI topology.
- `scalability-design.md`: gate registry and artifact layout support the first-release capacity targets.
- `reliability-design.md`: stable check names, deterministic GatePlan, and report contract define deployment behavior.
- `logical-components.md`: all U7 logical components map to CI/repository script surfaces.
- `components.md`: Package Check and Release Workflow Contract are separated from publish execution.
- `services.md`: GitHub Actions PR Gates are the external service boundary.
- `business-logic-model.md`: Gate Selection, Concrete Gate Execution Contract, and U8 handoff define deployment flow.
