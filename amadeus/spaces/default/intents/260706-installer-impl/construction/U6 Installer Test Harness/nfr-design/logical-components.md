# Logical Components — U6 Installer Test Harness

> Stage: construction / nfr-design  
> Unit: U6 Installer Test Harness

## Component Inventory

| Component | Responsibility | Failure Domain |
|---|---|---|
| `FixtureBuilderKit` | typed builders for tags, archives, distributions, targets, manifests, plans, prompts, failures | test setup correctness |
| `FakePortKit` | fake external and filesystem ports with call history and failure injection | deterministic dependency behavior |
| `TempTargetManager` | per-test temp roots, paths with spaces, cleanup diagnostics | filesystem isolation |
| `SnapshotNormalizer` | temp root, separator, timestamp, version placeholder normalization | stable UX evidence |
| `CoverageRegistry` | maps test ids to FR/US/NFR identifiers | traceability |
| `RegistryFreshnessCheck` | verifies mappings point to executable tests and Must requirements are covered | stale mapping prevention |
| `CoverageRatchetCheck` | prevents unintended coverage mapping decreases | quality floor |
| `SmokeCommandRunner` | runs minimal CLI entrypoints and captures normalized result model | executable package confidence |

## Boundaries

U6 components live in repository tests and support scripts. They must not become installer runtime concepts. U6 does not implement installer runtime behavior, publish npm packages, require release credentials, mutate real user projects, or call live GitHub in deterministic suites.

Concrete package script names and file layout are finalized in code-generation/build-and-test, but U6 requires each test command to be independently callable by U7 CI.

## Data Flow

1. Test declares `TestFixture` with stable `name` and `covers` ids.
2. `FixtureBuilderKit` creates source/target/manifest/plan/prompt inputs.
3. `FakePortKit` injects deterministic external behavior and records calls.
4. Installer service or CLI executes against fake ports/temp target.
5. Assertions check exit/result/plan/files/output/call order.
6. `CoverageRegistry` maps the test id to FR/US/NFR ids.
7. Freshness and ratchet checks feed U7 CI.

## Failure Domains

Fixture builder defects can mask installer regressions. Builders should be small, typed, and covered by their own smoke/unit tests.

Fake port defects can hide unsafe behavior. Fake ports must fail on unexpected live-like calls and expose call history.

Snapshot normalizer defects can hide meaningful output changes. Normalizers should be narrow and named.

Coverage registry defects can forge quality evidence. Freshness checks verify test existence and Must coverage.

Smoke command runner defects can make CI failures opaque. It must preserve command, cwd, exit code, stdout, and stderr separately.

## Infrastructure Bridge

U6 has no production infrastructure. Its bridge to U7 is a set of CI-callable commands for unit, integration, smoke, snapshot, registry freshness, and ratchet checks, plus concise machine-readable output suitable for GitHub Actions logs.

## Upstream Coverage

- `performance-requirements.md`: components map to suite/subset/smoke/registry benchmark surfaces.
- `security-requirements.md`: fake dependencies、temp isolation、snapshot normalization、secret-safe output、coverage evidence map to components.
- `scalability-requirements.md`: typed builders、registry summaries、snapshot controls、smoke limits map to scaling strategy.
- `reliability-requirements.md`: deterministic evidence、failure diagnostics、flake prevention、portability map to component boundaries.
- `tech-stack-decisions.md`: Bun test runner、fake ports、temp directories、focused snapshots、coverage registry/ratchet map to components.
- `business-logic-model.md`: test layers、fixture workflow、coverage registry workflow、integration boundaries を component boundaries に反映した。
