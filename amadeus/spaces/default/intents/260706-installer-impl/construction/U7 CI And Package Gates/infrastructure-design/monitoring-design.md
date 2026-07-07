# Monitoring Design — U7 CI And Package Gates

> Stage: construction / infrastructure-design  
> Unit: U7 CI And Package Gates

## Observability Scope

U7 has no runtime telemetry. Observability is GitHub Actions check status, per-gate JSON reports, normalized findings summaries, artifacts under `.amadeus-ci/setup/`, and the final U8 handoff status.

## Gate Signals

| Signal | Producer | Purpose |
|---|---|---|
| `change-set.json` | InstallerChangeDetector | explain installer-related/skipped decision |
| `GatePlan` | GatePlanner | list required/skipped gates and dependencies |
| `GateResult` | GateRunner/gate scripts | stable status: `passed`, `failed`, `skipped`, `passed-with-exception` |
| package reports | PackageMetadataGate / PackageDryRunGate | diagnose publish artifact safety |
| coverage report | CoverageGate | diagnose stale/decreased coverage floor |
| dependency/secret reports | SecurityGate | diagnose findings and allowlist exceptions |
| drift logs | DriftGuard | diagnose dist/self-install mismatch |
| CI summary | GateReporter | show blocking failures and U8 handoff status |

## GitHub Actions Summary

Summary output includes:

- installer-related decision and matched path reasons;
- gate matrix with stable check names;
- blocking failures with artifact paths;
- valid allowlist exceptions with owner/expiry/reason;
- skipped package-specific gates with reason;
- `U8 handoff ready` or `not ready`.

The summary must not say release-ready, published, or released.

## Secret-Safe Reporting

Secret reports include fingerprint, path, line, and rule id only. Dependency reports include advisory id, package, severity, reachability/surface, allowlist owner/expiry/reason when applicable. Environment dumps and secret values are forbidden.

## Failure Diagnostics

Missing scanner findings, malformed JSON, command timeout, unexpected package file, stale registry key, ratchet decrease, verified secret, and drift each produce a distinct failed gate with a report path. Independent gates should continue when executable so developers receive a complete failure set.

## Upstream Coverage

- `performance-design.md`: per-gate duration and bounded summary output support p95 tracking.
- `security-design.md`: reporting controls prevent secret leakage and distinguish passed-with-exception.
- `scalability-design.md`: artifact and summary strategy keep 1,000 finding reports readable.
- `reliability-design.md`: GateResult status values and report contract become observable signals.
- `logical-components.md`: GateReporter consumes outputs from every U7 component.
- `components.md`: Package Check diagnostics remain CI evidence, not release execution.
- `services.md`: GitHub Actions check summaries are the PR gate UX.
- `business-logic-model.md`: report contract and CI handoff to U8 define the signal model.
