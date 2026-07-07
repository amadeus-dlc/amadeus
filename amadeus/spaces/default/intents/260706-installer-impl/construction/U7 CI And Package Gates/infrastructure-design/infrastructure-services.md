# Infrastructure Services — U7 CI And Package Gates

> Stage: construction / infrastructure-design  
> Unit: U7 CI And Package Gates

## Service Inventory

U7 uses GitHub Actions and local scripts as infrastructure services:

| Boundary | Role | Release credential access |
|---|---|---|
| Changed File Source | supplies PR changed files | none |
| Bun Setup/Cache | installs runtime for gate scripts | none |
| Gate Planning Service | computes required/skipped gates | none |
| Package Gate Service | validates metadata and dry-run contents | none |
| U6 Test Gate Service | runs installer unit/integration/smoke/snapshot/coverage gates | none |
| Security Findings Producer | creates normalized dependency/secret findings | none |
| Security Gate Service | evaluates findings and allowlist | none |
| Drift Guard Service | runs dist/promote checks without auto-fix | none |
| Gate Reporting Service | writes JSON reports and summary | none |

## Normalized Findings Boundary

Scanner-producing steps may use different tools, but U7 consumes only normalized schemas:

- `.amadeus-ci/setup/dependency-findings.json`;
- `.amadeus-ci/setup/secret-findings.json`.

If a required findings file is absent, malformed, or missing required fields on an installer-related PR, the relevant security gate exits as CI failure. Tool-specific output is adapter-local and must not leak into gate logic.

## Root Validation Boundary

U7 must enforce that generated setup package TypeScript participates in root validation:

- root `bun run typecheck` includes `packages/setup/**/*.ts`;
- root `bun run lint` includes `packages/setup/`;
- root `bun run check` fails when setup package TypeScript or lint checks fail.

Dedicated package scripts may exist, but GitHub Actions cannot rely only on package-local manual commands.

## Package Boundary

Package metadata/dry-run gates inspect `packages/setup/package.json`, package `files`, bin entry, tarball contents, and root dev-only boundary. U7 rejects unexpected memory/audit/local state in package contents. U7 never runs npm publish.

## Upstream Coverage

- `performance-design.md`: services map to per-gate budgets and parallel execution.
- `security-design.md`: dependency/secret/allowlist/package controls and no-token boundary define service behavior.
- `scalability-design.md`: normalized findings, gate registry, and report artifacts preserve bounded growth.
- `reliability-design.md`: missing/malformed scanner output, drift, and skipped gates are deterministic service outcomes.
- `logical-components.md`: GateRegistry, GatePlanner, GateRunner, Package gates, CoverageGate, SecurityGate, DriftGuard, and GateReporter are represented.
- `components.md`: Package Check is CI-local; Release Workflow Contract remains U8 handoff.
- `services.md`: GitHub Actions PR Gates and npm publication are separated.
- `business-logic-model.md`: Gate Plan, Concrete Gate Execution Contract, and security/coverage/drift workflows define services.
