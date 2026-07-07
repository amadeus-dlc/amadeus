# CI/CD Pipeline — U7 CI And Package Gates

> Stage: construction / infrastructure-design  
> Unit: U7 CI And Package Gates

## Pipeline Position

U7 is the CI pipeline design for installer-related PR gates. It blocks merge on package, test, coverage, security, type/lint, dist, and self-install drift failures. It does not publish the npm package.

## GitHub Actions Jobs

| Job / check | Command surface | Blocking condition |
|---|---|---|
| `installer / change-detect` | changed-file classifier | malformed change set |
| `installer / package-metadata` | package metadata gate | invalid package metadata/root boundary |
| `installer / package-dry-run` | package dry-run gate | unexpected tarball contents |
| `installer / typecheck` | root `bun run typecheck` | TS errors, including `packages/setup/**/*.ts` |
| `installer / lint` | root `bun run lint` | lint errors, including `packages/setup/` |
| `installer / smoke` | U6 smoke command surface | failed smoke case |
| `installer / integration` | U6 integration command surface | failed behavior/coverage key |
| `installer / coverage-registry` | U6 freshness/ratchet | stale mapping or coverage decrease |
| `installer / dist-check` | `bun run dist:check` | generated dist drift |
| `installer / promote-self-check` | `bun run promote:self:check` | self-install drift |
| `installer / dependency-audit` | normalized findings + SecurityGate | blocking High/Critical finding or invalid findings/allowlist |
| `installer / secret-scan` | normalized findings + SecurityGate | verified secret or invalid findings |

## Execution Strategy

GitHub Actions should run independent gates in parallel where practical. `package-dry-run`, installer smoke/integration, and dependency audit may depend on `package-metadata`. Typecheck, lint, dist-check, secret-scan, and change-detect should still run when executable to provide a complete failure set.

Non-installer PRs may skip package-specific installer gates with explicit skipped reports, but global security gates must not be weakened by U7 path selection.

## Scanner Adapter Requirement

Before `dependency-audit` and `secret-scan` evaluate findings, scanner-producing steps write normalized JSON files under `.amadeus-ci/setup/`. If an installer-related PR reaches security gate evaluation without the required normalized file, the gate fails deterministically.

## Release Handoff

U7 successful PR gates produce U8 preflight evidence only. U8 release workflow must rerun relevant gates before package dry-run, SBOM/provenance generation, npm publish validation, and post-publish verification. A `main` merge alone does not publish.

## Upstream Coverage

- `performance-design.md`: job partitioning preserves parallel execution and 20 min p95 budget.
- `security-design.md`: dependency/secret/package gates and no-token boundary are blocking CI requirements.
- `scalability-design.md`: gate registry, findings counts, artifact counts, and matrix strategy shape the workflow.
- `reliability-design.md`: deterministic skipped/failed/passed-with-exception reporting defines CI behavior.
- `logical-components.md`: jobs map to U7 components and U6 command surfaces.
- `components.md`: Package Check and Release Workflow Contract stay separated.
- `services.md`: GitHub Actions PR Gates are implemented while npm publication remains U8.
- `business-logic-model.md`: Concrete Gate Execution Contract and CI Handoff To U8 define the pipeline.
