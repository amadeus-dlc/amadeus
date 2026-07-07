# Logical Components — U8 Manual Release And Docs

> Stage: construction / nfr-design  
> Unit: U8 Manual Release And Docs

## Component Inventory

| Component | Responsibility | Failure Domain |
|---|---|---|
| `ReleaseWorkflow` | GitHub Actions `workflow_dispatch` orchestration | release sequencing |
| `ReleaseInputValidator` | validates tag, dry_run, npm_dist_tag, confirm_package | input guard |
| `ReleaseTagSelector` | resolves omitted tag to latest stable SemVer tag | provenance source |
| `ReleasePreflightRunner` | runs U7 gates in release mode without changed-file skip | pre-publish quality |
| `PackageBuilder` | builds `@amadeus-dlc/setup` package | package artifact |
| `ReleaseEvidenceGenerator` | produces SBOM/provenance evidence | supply-chain evidence |
| `PublishValidator` | checks tag/package version/npm metadata and non-secret publish eligibility | publish guard |
| `PublishIdentityValidator` | verifies exactly one publish identity inside the protected publish environment for real publish only | credential boundary |
| `PublishExecutor` | runs exactly one `npm publish` command when allowed | npm side effect |
| `PostPublishVerifier` | verifies npm metadata, bin, tarball, docs consistency, optional bunx help | post-publish evidence |
| `DocsConsistencyChecker` | validates installer-first docs and command/package references | docs safety |
| `ReleaseReporter` | writes release summary and artifacts without secrets | maintainer diagnostics |

## Boundaries

U8 owns manual release and docs. It does not run on ordinary push, pull request, or tag push. It publishes only `@amadeus-dlc/setup` from `packages/setup`. It does not publish multiple packages, manage multi-registry release, or broaden U7 PR gates.

U7 gates are reused as release preflight but run in release mode unconditionally. U8 does not let `installerRelated:false` skip release validation.

## Data Flow

1. Maintainer starts `.github/workflows/release-setup.yml` through GitHub Actions button.
2. `ReleaseInputValidator` validates inputs.
3. `ReleaseTagSelector` selects explicit tag or latest stable SemVer tag.
4. `ReleasePreflightRunner` executes U7 gates in release mode.
5. `PackageBuilder` and U7 package dry-run validate package contents.
6. `ReleaseEvidenceGenerator` writes SBOM/provenance evidence.
7. `DocsConsistencyChecker` validates installer-first docs, `install` / `upgrade`, no `init`, `bunx`, best-effort `npx` caveat, and Bun-required wording before any dry-run or publish result is finalized.
8. `PublishValidator` checks npm metadata, dist-tag, package version, existing-version status, and non-secret publish eligibility. It does not read npm tokens and does not require protected environment approval for `dry_run:true`.
9. If `dry_run:true`, `ReleaseReporter` ends with dry-run summary after validation and docs checks. No publish identity validation, protected environment secret access, or `npm publish` command is invoked.
10. If `dry_run:false`, protected environment approval gates `PublishIdentityValidator` and `PublishExecutor`.
11. `PublishIdentityValidator` verifies exactly one selected publish identity mode inside the protected environment. Token-based mode may inspect only token presence/configuration without printing it; trusted publishing mode verifies identity binding/provenance capability. Missing, ambiguous, or unverifiable identity blocks publish before `npm publish`.
12. `PublishExecutor` runs the single allowed publish command.
13. `PostPublishVerifier` runs after publish.
14. `ReleaseReporter` writes final summary and artifact links.

## Failure Domains

Input validation defects can publish wrong package/tag. Fixtures cover exact package and prerelease dist-tag rules.

Tag selector defects can release wrong source. Fixtures cover v/non-v duplicates and prerelease exclusion.

Preflight runner defects can skip required U7 gates. Release-mode tests assert all 11 gates are required.

Publish validator defects can allow duplicate version or invalid dist-tag/package mismatch. Fixtures cover existing npm version and prerelease/latest conflicts.

Publish identity validator defects can allow missing or ambiguous credentials. Fixtures cover missing identity, token mode, trusted publishing mode, and both-modes ambiguity. These fixtures run on the real publish path only; dry-run fixtures assert no credential/protected-environment secret access occurs.

Publish executor defects can retry or leak credentials. Workflow review/tests assert single publish attempt and secret-safe logs.

Docs checker defects can leave stale instructions. Snapshot/text fixtures cover install/upgrade, no init, Bun/npx caveat, safety text, and assert docs checks run for dry-run as well as publish validation.

## Infrastructure Bridge

U8 bridges repository scripts to GitHub Actions protected release environment and npm registry. Required infrastructure is `workflow_dispatch`, Bun setup, U7 preflight commands, artifact upload, npm registry access for non-secret validation/post-publish, and for real publish only: protected environment approval plus exactly one verified npm publish identity.

## Upstream Coverage

- `performance-requirements.md`: components map to input/tag/preflight/build/evidence/publish/docs timing surfaces.
- `security-requirements.md`: manual trigger、protected environment、publish identity、SBOM/provenance、publish guards、docs safety map to components.
- `scalability-requirements.md`: one package/one tag workflow、artifact strategy、docs scope map to scaling constraints.
- `reliability-requirements.md`: release state machine、determinism、diagnostics、docs consistency map to component boundaries.
- `tech-stack-decisions.md`: workflow_dispatch、release-setup.yml、Bun scripts、publish command、identity contract、docs surfaces map to components.
- `business-logic-model.md`: Release Workflow、Tag Selection、Release Preflight Policy、Validation Plan、Publish Guard、Post-Publish Verification、Documentation Workflow を component boundaries に反映した。
