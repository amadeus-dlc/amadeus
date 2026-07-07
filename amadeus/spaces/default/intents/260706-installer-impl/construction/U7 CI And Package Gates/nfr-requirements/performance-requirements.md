# Performance Requirements — U7 CI And Package Gates

> Stage: construction / nfr-requirements  
> Unit: U7 CI And Package Gates  
> Upstream: `business-logic-model.md`, `business-rules.md`, `requirements.md`, `technology-stack.md`

## Scope

U7 performance covers GitHub Actions PR gate selection, package validation commands, installer smoke/integration handoff, coverage registry/ratchet checks, dependency/secret gate evaluation, drift guard commands, and CI report generation. It does not include npm publish, SBOM/provenance generation, or post-publish verification.

## Targets

| Scenario | Target | Measurement |
|---|---:|---|
| changed-file installer classification | p95 <= 5s | CI step timing |
| package metadata gate | p95 <= 2 min | GitHub Actions check timing |
| package dry-run gate | p95 <= 3 min | GitHub Actions check timing |
| installer smoke gate | p95 <= 5 min | GitHub Actions check timing |
| installer integration gate | p95 <= 10 min | GitHub Actions check timing |
| coverage registry/ratchet gate | p95 <= 3 min | GitHub Actions check timing |
| typecheck gate | p95 <= 5 min | GitHub Actions check timing |
| lint gate | p95 <= 5 min | GitHub Actions check timing |
| dist-check gate | p95 <= 5 min | GitHub Actions check timing |
| promote-self-check gate | p95 <= 5 min | GitHub Actions check timing |
| dependency scanner adapter plus normalized findings emission | p95 <= 5 min | GitHub Actions check timing |
| secret scanner adapter plus normalized findings emission | p95 <= 5 min | GitHub Actions check timing |
| security gate evaluation after scanner output exists | p95 <= 5 min | GitHub Actions check timing |
| full installer-related PR gate set | p95 <= 20 min | GitHub Actions workflow duration with parallel gates |

The full gate target assumes parallel execution for independent gates and cached Bun dependencies. CI Pipeline design may choose the concrete dependency and secret scanner tools, but their scanner-producing steps must emit normalized findings within the gate timeout and fit inside the full workflow p95. Absence, timeout, or malformed normalized output fails deterministically.

## Measurement Protocol

Measurements run in GitHub Actions with Bun `1.3.13` as described in `technology-stack.md`. Gate scripts write reports under `.amadeus-ci/setup/` and expose per-gate duration in CI logs or JSON reports.

| Scenario | Samples | Warmup | Pass condition | Fail condition |
|---|---:|---:|---|---|
| classification | 20 PR fixture samples | none | p95 within target and path classification correct | slow or wrong skip/required decision |
| package gates | 10 CI samples | none | p95 within target and report JSON emitted | timeout or missing report |
| test gates | 10 CI samples | none | p95 within target and U6 coverage keys pass | timeout or missing coverage key |
| type/lint/drift gates | 10 CI samples | none | p95 within target and existing commands conclude | timeout or unresolved required check |
| scanner-producing steps | 10 CI samples | none | p95 within target and normalized findings JSON emitted | timeout, absent findings file, or malformed JSON |
| security gates | 10 CI samples | none | p95 within target after normalized findings exist | timeout or schema handling drift |
| full workflow | 5 installer PR samples | none | p95 within target and all required checks conclude | timeout or unresolved required check |

Correct pass/fail classification takes precedence over speed.

## Resource Constraints

- Independent gates should run in parallel where GitHub Actions supports it.
- `package-metadata` should fail early but must not suppress unrelated executable gate results.
- U7 must not run release publish steps or npm credential setup.
- Installer-specific gates may be skipped only when `change-set.json` proves `installerRelated:false`.
- Reports must be bounded JSON/log output suitable for CI artifacts.
- Scanner adapters must write `.amadeus-ci/setup/dependency-findings.json` and `.amadeus-ci/setup/secret-findings.json` before `security-gate.ts` runs on installer-related PRs.
- Missing scanner findings on required paths is a CI failure, not a skipped gate.

## Upstream Coverage

- `business-logic-model.md`: gate selection, Concrete Gate Execution Contract, and parallel execution define measured paths.
- `business-rules.md`: gate requirement, test/coverage, security, drift, and reporting rules define correctness gates.
- `requirements.md`: FR-016 and NFR-005 define blocking CI performance expectations and dependency discipline.
- `technology-stack.md`: Bun/TypeScript and existing CI commands define the execution baseline.
