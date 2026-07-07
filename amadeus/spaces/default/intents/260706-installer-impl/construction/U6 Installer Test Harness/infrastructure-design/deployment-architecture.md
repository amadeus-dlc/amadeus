# Deployment Architecture — U6 Installer Test Harness

> Stage: construction / infrastructure-design  
> Unit: U6 Installer Test Harness

## Architecture Summary

U6 has no production deployment. It is repository-local test infrastructure that runs under Bun in developer machines and GitHub Actions. It proves U1-U5 installer contracts through fake ports, temp targets, synthetic fixtures, snapshots, coverage registry freshness, and coverage ratchet checks.

The test harness must not become part of `@amadeus-dlc/setup` runtime behavior.

## Runtime Topology

| Layer | Deployment surface | Notes |
|---|---|---|
| `FixtureBuilderKit` | test helper modules | creates typed tags, archives, distributions, targets, manifests, plans, prompts, failures |
| `FakePortKit` | test helper modules | fake external/filesystem/prompt/clock ports with call history and failure injection |
| `TempTargetManager` | test helper modules | per-test temp roots, paths with spaces, cleanup diagnostics |
| `SnapshotNormalizer` | test helper modules | normalizes temp roots, separators, timestamps, versions |
| `CoverageRegistry` | machine-readable test metadata | maps test ids to FR/US/NFR identifiers |
| `RegistryFreshnessCheck` | CI-callable script/test | validates mapped tests exist and Must coverage is present |
| `CoverageRatchetCheck` | CI-callable script/test | prevents unintended coverage decreases |
| `SmokeCommandRunner` | CI-callable helper | runs minimal CLI entrypoints and captures stdout/stderr/exit |

## Environment Definitions

| Environment | Purpose |
|---|---|
| local developer | fast focused installer tests and fixture debugging |
| GitHub Actions PR | blocking unit/integration/smoke/snapshot/registry/ratchet checks |
| release workflow dry-run | reuses deterministic installer tests before package dry-run/publish validation |

U6 uses no hosted service, cloud account, database, queue, cache, IAM role, npm credential, or GitHub credential.

## Command Surface

U7 must be able to call these surfaces independently:

- installer unit tests;
- installer integration tests;
- installer smoke tests;
- installer snapshot tests;
- coverage registry freshness check;
- coverage ratchet check;
- root `bun run typecheck` and `bun run lint` that include `packages/setup/**/*.ts`.

The exact script names are finalized during code-generation/build-and-test, but the boundaries must remain independently executable so CI can report actionable failures.

## Upstream Coverage

- `performance-design.md`: deployment topology preserves suite partitioning and timing budgets.
- `security-design.md`: no live services, no real project mutation, and secret-safe diagnostics define environment boundaries.
- `scalability-design.md`: fixture/test/mapping/snapshot capacities define command surface scale.
- `reliability-design.md`: fake ports, injected clocks, normalized snapshots, and flake prevention define runtime topology.
- `logical-components.md`: all U6 logical components map to local test infrastructure surfaces.
- `components.md`: installer runtime components are test subjects, not places to host U6 helpers.
- `services.md`: GitHub Actions PR gates consume the command surface.
- `business-logic-model.md`: test layers, fixture workflow, and coverage registry workflow define deployment flow.
