# Deployment Architecture — U8 Manual Release And Docs

> Stage: construction / infrastructure-design  
> Unit: U8 Manual Release And Docs

## Architecture Summary

U8 deploys the manual release workflow for `@amadeus-dlc/setup`. The workflow is `.github/workflows/release-setup.yml`, triggered only by GitHub Actions `workflow_dispatch`. It supports dry-run validation and guarded publish for exactly one package from `packages/setup`.

Normal push, merge, and tag push do not publish.

## Workflow Topology

| Layer | Deployment surface | Notes |
|---|---|---|
| `workflow_dispatch` | GitHub Actions button | inputs: `tag`, `dry_run`, `npm_dist_tag`, `confirm_package` |
| `ReleaseInputValidator` | CI script | fails before credential use |
| `ReleaseTagSelector` | CI script | omitted tag resolves to latest stable SemVer tag; v-prefixed duplicate preferred |
| `ReleasePreflightRunner` | CI job | reruns all U7 gates in release mode without changed-file skip |
| `PackageBuilder` / dry-run | CI job | builds and validates `packages/setup` package artifact |
| `ReleaseEvidenceGenerator` | CI job | writes SBOM/provenance evidence before publish |
| `DocsConsistencyChecker` | CI script | enforces installer-first docs, `install` / `upgrade`, no `init` |
| `PublishValidator` | CI script | checks npm metadata, package version, dist-tag, existing version |
| protected publish environment | GitHub Actions environment | approval and secret/identity boundary for real publish |
| `PublishIdentityValidator` | publish job | verifies exactly one publish identity mode |
| `PublishExecutor` | publish job | runs exactly one `npm publish` from `packages/setup` |
| `PostPublishVerifier` | CI script | checks npm metadata, bin, tarball, docs consistency |

## Environment Definitions

| Environment | Purpose |
|---|---|
| local developer | run release validation scripts in dry-run-like mode |
| GitHub Actions dry-run | validate selected tag/package/docs/evidence without publish credentials |
| GitHub Actions protected publish | real publish after approval and identity validation |

`dry_run:true` never enters protected publish secret access and never calls `npm publish`.

## Release State Boundaries

| State | Infrastructure boundary |
|---|---|
| dry-run | validation/evidence/docs only; no protected secrets |
| publish-blocked | protected approval or identity validation fails before `npm publish` |
| publish-failed | one publish command attempted and failed; no retry loop |
| published-verification-failed | publish happened; post-publish checks failed and report names follow-up |
| published | publish and post-publish checks passed |

## Upstream Coverage

- `performance-design.md`: topology maps to input/tag/preflight/build/evidence/publish/docs timing surfaces.
- `security-design.md`: manual trigger, protected environment, identity contract, and no auto-publish shape deployment.
- `scalability-design.md`: one package/one tag and bounded artifact strategy define release scale.
- `reliability-design.md`: state machine and determinism invariants define release boundaries.
- `logical-components.md`: all U8 components map to workflow jobs/scripts.
- `components.md`: Release Workflow Contract and Documentation Update Owner become deployment surfaces.
- `services.md`: npm Registry Publication is the only external publish side effect.
- `business-logic-model.md`: workflow inputs, tag selection, preflight, validation, publish guard, and docs workflow define release flow.
