# Practices Discovery Evidence

## Sources Scanned

- `amadeus/spaces/default/codekb/amadeus/*.md`
- `amadeus/spaces/default/memory/{team,project}.md`
- `amadeus/spaces/default/memory/phases/inception.md`
- `amadeus/spaces/default/intents/260706-installer-impl/amadeus-state.md`
- `package.json`, `bun.lock`, `biome.json`, `.github/workflows/ci.yml`
- `README.md`, `CHANGELOG.md`, `LICENSE-MIT`, `LICENSE-APACHE`
- `core/tools/*.ts`, `scripts/package.ts`, `scripts/promote-self.ts`
- `tests/`, `tests/run-tests.ts`, `tests/.coverage-registry.json`, `tests/.coverage-ratchet.json`
- Git history and branch/PR evidence, including PR #608 (`https://github.com/amadeus-dlc/amadeus/pull/608`)

## Pipeline & Deployment Findings

Branch history and team memory support a GitHub Flow / trunk-based practice: short-lived branches target `main` through Pull Requests. The current repository has CI at `.github/workflows/ci.yml`, but no publish workflow, release automation, CodeQL/Semgrep/Gitleaks/Trivy/SBOM/SLSA configuration, or environment topology for dev/staging/prod service deployment.

For this intent, "deployment" means package and release distribution rather than infrastructure rollout. The affirmed release practice is a manually triggered GitHub Actions release (`workflow_dispatch`) that normally publishes from the latest stable tag.

## Quality Findings

CI currently runs Bun install with frozen lockfile, typecheck, Biome lint, `dist:check`, `promote:self:check`, and smoke+unit+integration tests. Test execution is Bun-based, and release-level e2e is heavier than the default CI profile.

The repository does not enforce line coverage percentage. The effective evidence-based coverage practice is `covers:` metadata, `tests/.coverage-registry.json`, and ratchet checks. The user affirmed that installer work should follow this registry/ratchet model, with CI blocking on registry freshness/ratchet plus installer smoke/unit/integration tests.

## Developer Practice Findings

The repository is a TypeScript/Bun modular monolith with `core/` as the harness-neutral source of truth, `harness/<name>/` as harness-specific surfaces, `scripts/package.ts` as distribution producer, `dist/<harness>/` as committed generated output, and `scripts/promote-self.ts` as repo-local dogfood promotion.

The user challenged the initial `packages/setup/` proposal as non-MECE because it would place one package under `packages/` while `core/` and `harness/` remain top-level. The affirmed resolution is staged: add `packages/setup/` now, keep existing framework paths stable, and explicitly defer full repo-layout normalization to a separate refactor.

## DevSecOps Findings

The current supply-chain strengths are frozen lockfile install and deterministic drift guards. Current gaps include no configured security scanner workflow, weakly pinned `bunx` lint tooling, and publish metadata mismatch in root `package.json` (`private: true`, dev-only package name, stale repository, and license mismatch with the checked-in MIT/Apache license files).

The user affirmed deterministic installer PR gates: package dry-run, installer smoke/integration, dependency audit or OSV, and secret scan should block installer PRs. SBOM/provenance belongs in the release workflow.

## Asked vs. Inferred

Inferred from evidence: PR-based `main` flow, existing CI gates, generated distribution parity, source/distribution boundaries, test runner shape, and the lack of existing publish/security automation.

Asked and answered through grilling:

1. Repository package boundary: staged `packages/setup/` now; full repo re-layout deferred.
2. Testing posture: coverage registry + ratchet, with CI blocking on registry and installer tests.
3. Release practice: GitHub Actions `workflow_dispatch`, normally from latest stable tag.
4. Security gates: deterministic checks block PRs; SBOM/provenance at release.
5. CLI style: human-readable user output, structured internals, non-interactive conflicts fail unless explicit force/backup policy is provided.
