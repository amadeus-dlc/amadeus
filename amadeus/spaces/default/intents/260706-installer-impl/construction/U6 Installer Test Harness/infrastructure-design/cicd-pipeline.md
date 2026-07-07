# CI/CD Pipeline — U6 Installer Test Harness

> Stage: construction / infrastructure-design  
> Unit: U6 Installer Test Harness

## Pipeline Position

U6 is the local evidence layer that U7 turns into GitHub Actions gates. It does not publish the installer. Its outputs must be independently callable so CI can fail fast with actionable messages.

## Required Commands

| Command surface | Required evidence |
|---|---|
| installer unit tests | parser, version resolver, target detector helpers, planner, result classifier |
| installer integration tests | fake ports plus temp filesystem for U3-U5 flows |
| installer smoke tests | minimal executable CLI paths such as help, clean install temp target, no-write collision |
| installer snapshot tests | normalized reporter output for plan, no-write, failures, success |
| registry freshness check | mapped tests exist and Must FR/US/NFR coverage is present |
| coverage ratchet check | mapped coverage does not unintentionally decrease |
| root type/lint | `packages/setup/**/*.ts` participates in root `bun run typecheck`, `bun run lint`, and `bun run check` |

## Gate Composition

The default PR gate should run:

1. root typecheck/lint including `packages/setup/**/*.ts`;
2. deterministic installer unit/integration/smoke/snapshot suites;
3. coverage registry freshness;
4. coverage ratchet;
5. dist and self-install parity when installer changes affect generated/self-installed trees.

If full deterministic installer suite exceeds the 120s p95 budget, split into blocking contract/smoke gates and scheduled extended tests. The blocking gate must still include no-write, backup-order, manifest failure, and registry freshness evidence.

## Failure Handling

Every command returns a stable non-zero exit when its evidence fails. Failures must name fixture/scenario/test id. Registry failures must name missing FR/US/NFR ids. Smoke failures must include command, cwd, exit code, stdout, and stderr after normalization and secret scrub.

## Release Interaction

Manual release workflow should rerun the deterministic installer gate before package dry-run, SBOM/provenance generation, and npm publish validation. It must not rely on a previous PR run alone.

## Upstream Coverage

- `performance-design.md`: command partitioning and suite budgets define CI composition.
- `security-design.md`: fake ports, temp isolation, no live credentials, and secret-safe output are blocking requirements.
- `scalability-design.md`: capacity targets define when to split blocking and scheduled checks.
- `reliability-design.md`: deterministic failure diagnostics and flake prevention define command behavior.
- `logical-components.md`: command surfaces map to FixtureBuilderKit, FakePortKit, TempTargetManager, SnapshotNormalizer, CoverageRegistry, freshness, ratchet, and smoke runner.
- `components.md`: CI verifies setup package components while keeping test helpers out of runtime.
- `services.md`: GitHub Actions PR gates and manual release posture are preserved.
- `business-logic-model.md`: test layers, fixture workflow, coverage registry workflow, and failure modes define the pipeline.
