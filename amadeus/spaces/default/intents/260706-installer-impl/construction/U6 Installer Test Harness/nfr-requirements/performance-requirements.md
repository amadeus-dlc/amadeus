# Performance Requirements — U6 Installer Test Harness

> Stage: construction / nfr-requirements  
> Unit: U6 Installer Test Harness  
> Upstream: `business-logic-model.md`, `business-rules.md`, `requirements.md`, `technology-stack.md`

## Scope

U6 performance covers the installer test harness itself: fixture construction, fake ports, temp filesystem integration tests, smoke command execution, snapshot rendering, coverage registry checks, and ratchet checks. It does not benchmark live GitHub, npm publication, or real user projects.

## Targets

| Scenario | Target | Measurement |
|---|---:|---|
| full deterministic installer test suite | p95 <= 120s | CI job timing |
| unit test subset for U1-U4 pure contracts | p95 <= 20s | Bun test timing |
| temp filesystem integration subset for U3-U5 | p95 <= 60s | Bun test timing |
| CLI smoke subset | p95 <= 30s | spawned command timing |
| coverage registry freshness check | p95 <= 5s | local registry check |
| coverage ratchet check | p95 <= 5s | local registry check |

These targets keep U7 CI gates practical while still covering the Must requirements in `requirements.md`.

## Measurement Protocol

Measurements run under Bun/TypeScript on the CI baseline described in `technology-stack.md`. The benchmarked test suite must use fake network ports and temporary directories; live GitHub and npm credentials are forbidden.

| Scenario | Samples | Warmup | Pass condition | Fail condition |
|---|---:|---:|---|---|
| full suite | 5 CI samples | none | p95 within target and all required mappings present | slow suite or missing mapping |
| unit subset | 10 local samples | first 1 discarded | p95 within target and no filesystem side effects | slow subset or side effects |
| integration subset | 5 local samples | none | p95 within target and temp dirs cleaned | slow subset or leaked temp dir |
| smoke subset | 5 local samples | none | p95 within target and expected exit codes observed | slow smoke or wrong exit |
| registry checks | 20 local samples | first 2 discarded | p95 within target and deterministic output | slow or nondeterministic output |

Functional correctness and isolation failures take precedence over performance classification.

## Resource Constraints

- Fixture builders must avoid copying large real `dist/` trees when minimal source fixtures satisfy the case.
- Temp directories must be isolated per test and cleaned after test completion.
- Snapshot tests must use small canonical cases; large operation counts use generated assertions rather than huge committed snapshots.
- Fake archive and tag sources must not perform network I/O.
- Smoke tests should spawn only the installer entrypoints necessary to verify CLI behavior.

## Upstream Coverage

- `business-logic-model.md`: test layers, fixture workflow, coverage registry workflow, and failure modes define measured paths.
- `business-rules.md`: required test matrix and invariants define correctness gates.
- `requirements.md`: FR-001 through FR-016 and NFR-001 through NFR-006 define test coverage expectations.
- `technology-stack.md`: Bun/TypeScript CI environment and existing commands define measurement baseline.

