# Logical Components — U7 CI And Package Gates

> Stage: construction / nfr-design  
> Unit: U7 CI And Package Gates

## Component Inventory

| Component | Responsibility | Failure Domain |
|---|---|---|
| `InstallerChangeDetector` | builds `InstallerChangeSet` from PR changed files | gate selection |
| `GateRegistry` | stores GateName/checkName/command/cwd/artifact/timeout/dependencies/path conditions | gate contract drift |
| `GatePlanner` | builds required/skipped `GatePlan` | required gate coverage |
| `GateRunner` | executes or wires GitHub Actions jobs/steps and records `GateResult` | CI execution |
| `PackageMetadataGate` | validates setup package metadata and root dev-only boundary | publish metadata safety |
| `PackageDryRunGate` | validates tarball contents and files allowlist | publish artifact safety |
| `CoverageGate` | validates registry freshness and ratchet | quality floor |
| `SecurityGate` | evaluates normalized dependency/secret findings and allowlist | supply-chain security |
| `DriftGuard` | runs dist-check and promote-self-check without auto-fix | generated artifact drift |
| `GateReporter` | writes JSON artifacts and GitHub Actions summary | maintainer diagnostics |

## Boundaries

U7 components run in GitHub Actions PR gates and maintainer scripts. They do not publish npm packages, configure npm tokens, create GitHub Releases, create tags, generate SBOM/provenance, or perform post-publish verification. U8 owns release workflow execution.

Scanner adapters may choose tools later, but `SecurityGate` consumes only normalized findings files. If normalized files are missing or malformed on required paths, U7 fails.

## Data Flow

1. GitHub Actions provides PR changed files.
2. `InstallerChangeDetector` writes `.amadeus-ci/setup/change-set.json`.
3. `GatePlanner` uses `GateRegistry` to build `GatePlan`.
4. GitHub Actions runs independent gates in parallel where possible.
5. Scanner-producing steps write normalized dependency/secret findings.
6. `SecurityGate` evaluates findings and allowlist.
7. `CoverageGate` evaluates U6 registry and ratchet.
8. `GateReporter` writes artifacts and summary.
9. PR check conclusion is failure if any blocking gate failed.
10. U8 may reuse successful U7 gates as release preflight.

## Failure Domains

Change detector defects can skip required installer gates. Classifier fixture tests cover path rules and matched reasons.

Gate registry drift can call wrong commands. Contract tests compare GateRegistry with Concrete Gate Execution Contract.

Security gate defects can hide vulnerabilities or leak secrets. Schema fixtures and redaction snapshots cover both.

Coverage gate defects can forge quality evidence. Freshness and ratchet fixtures cover stale/decreased keys.

Reporter defects can confuse maintainers. Snapshot tests cover skipped, failed, passed-with-exception, and U8 handoff summaries.

## Infrastructure Bridge

U7 bridges local scripts to GitHub Actions. Required infrastructure elements are Bun setup, dependency cache, changed-file source, scanner-producing steps, report artifact upload, and stable check names. No release credentials are configured.

## Upstream Coverage

- `performance-requirements.md`: components map to classifier/package/test/security/drift/report timing surfaces.
- `security-requirements.md`: dependency/secret gates、allowlist governance、package validation、no publish token map to components.
- `scalability-requirements.md`: gate registry、findings evaluation、artifact strategy map to scaling constraints.
- `reliability-requirements.md`: deterministic GatePlan、stable check names、failure diagnostics、U8 handoff only map to component boundaries.
- `tech-stack-decisions.md`: GitHub Actions、Bun scripts、JSON artifacts、normalized schemas、coverage floor map to components.
- `business-logic-model.md`: Gate Selection、Gate Plan、Concrete Gate Execution Contract、Dependency/Secret/Coverage/Drift workflows、CI Handoff To U8 を component boundaries に反映した。
