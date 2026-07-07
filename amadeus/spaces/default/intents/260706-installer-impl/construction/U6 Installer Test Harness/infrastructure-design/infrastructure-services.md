# Infrastructure Services — U6 Installer Test Harness

> Stage: construction / infrastructure-design  
> Unit: U6 Installer Test Harness

## Service Inventory

U6 introduces no managed service. Its local infrastructure services are test-only modules and scripts:

| Boundary | Role | Production runtime access |
|---|---|---|
| Fixture Builder Service | typed synthetic data setup | none |
| Fake Port Service | deterministic dependency behavior and call history | none |
| Temp Target Service | isolated mutable filesystem targets | none |
| Snapshot Normalization Service | stable UX and diagnostics snapshots | none |
| Coverage Registry Service | FR/US/NFR traceability mapping | none |
| Registry Freshness Service | stale/missing mapping detection | none |
| Coverage Ratchet Service | mapping decrease guard | none |
| Smoke Command Service | executable CLI confidence | none |

## Fake Port Contracts

Fake ports must support:

- configured success and failure paths;
- call history with arguments;
- fail-fast on unexpected calls for safety-sensitive tests;
- count-based retry outcomes, not sleep/timing behavior;
- injected clocks for timestamps;
- secret-safe stdout/stderr capture.

Fake ports are not mocks of implementation details. They are contract fixtures for external boundaries defined by U1-U5.

## Temp Target Boundary

All mutation tests run under per-test temp roots. Temp target names include paths with spaces. Cleanup failures are reported as diagnostics without hiding the original test failure. Tests must assert that no mutation escapes the temp root.

## Coverage Registry Boundary

Coverage registry entries map executable test ids to FR/US/NFR identifiers. Freshness checks fail when:

- a mapped test id no longer exists;
- a Must requirement lacks a mapping;
- registry schema is invalid;
- coverage ratchet detects an unintended decrease.

Line coverage percentage is not the primary quality floor.

## External Service Boundary

Deterministic suites must not call live GitHub, npm registry, or release credentials. Live release validation belongs to manual release workflow gates, not U6 deterministic tests.

## Upstream Coverage

- `performance-design.md`: services keep deterministic suites within CI budgets.
- `security-design.md`: fake dependencies, temp isolation, secret-safe logs, and no-write evidence define service controls.
- `scalability-design.md`: local services scale to the first-release mapping/test/tag/snapshot targets.
- `reliability-design.md`: service contracts preserve deterministic failure diagnostics and flake prevention.
- `logical-components.md`: FixtureBuilderKit, FakePortKit, TempTargetManager, SnapshotNormalizer, CoverageRegistry, freshness, ratchet, and smoke runner are represented.
- `components.md`: test services exercise setup package components without entering runtime package boundaries.
- `services.md`: GitHub Actions consumes these service outputs as PR gates.
- `business-logic-model.md`: fixture workflow and coverage registry workflow define service behavior.
