# Reliability Requirements — U8 Manual Release And Docs

> Stage: construction / nfr-requirements  
> Unit: U8 Manual Release And Docs  
> Upstream: `business-logic-model.md`, `business-rules.md`, `requirements.md`, `technology-stack.md`

## Scope

U8 reliability means a maintainer can press a GitHub Actions release button and get a deterministic non-publish dry-run or a guarded publish attempt, with clear evidence before and after npm publication. It also means docs consistently point users to `install` and `upgrade` rather than stale manual-copy or `init` instructions.

## Reliability Targets

| Scenario | Requirement | Evidence |
|---|---|---|
| no tag input | highest stable SemVer tag selected, v-prefixed duplicate preferred | tag fixture |
| explicit missing tag | workflow fails before build/publish | tag fixture |
| explicit prerelease with `latest` | workflow fails before publish | input fixture |
| `dry_run:true` | all validation reports produced and no publish invoked | dry-run fixture |
| U7 preflight failure | release stops before build/publish | preflight fixture |
| package version already exists | publish-validation fails before `npm publish` | npm metadata fixture |
| publish identity missing or ambiguous | workflow fails before publish attempt | environment fixture |
| npm publish failure | no retry loop hides failure; summary names package/version and failure | publish fixture |
| post-publish verification failure | workflow fails after publish and clearly reports published state | post-publish fixture |
| docs stale command/package name or missing `npx` caveat | docs consistency check fails | docs fixture |

## Failure Handling

- Input validation failures stop before expensive validation and before credential use.
- U7 preflight failures stop before build/publish and preserve per-gate reports.
- SBOM/provenance failure stops before publish.
- Publish validation failure stops before `npm publish`.
- Publish identity validation failure stops before `npm publish`; token mode and trusted-publishing mode are resolved in later CI/Deployment design but the release workflow must verify exactly one configured mode before publish.
- `npm publish` is attempted at most once per workflow execution.
- Post-publish verification failure is a release follow-up failure, not evidence that publish did not happen.
- Docs consistency failures block release until command/package references are corrected.

## Determinism Requirements

The following invariants are mandatory:

- workflow trigger for publish path is `workflow_dispatch` only.
- `tag` input is exact when present.
- omitted tag uses stable SemVer tag ordering, not GitHub Release metadata ordering.
- release context sets U7 preflight mode to `release` and never records `installerRelated:false`.
- package version is derived from the selected tag/package metadata and checked before publish.
- publish command runs with `cwd=packages/setup`.
- docs use `amadeus-setup install` and `amadeus-setup upgrade`, not `init`.
- docs include `bunx`, best-effort `npx` caveat, and Bun-required wording for this release.

## Portability Reliability

| Surface | Requirement | Verification |
|---|---|---|
| GitHub Actions shell | release commands use Bun/TypeScript scripts and explicit `cwd` | workflow fixture |
| package path | `packages/setup` is repo-relative and validated before publish | package fixture |
| docs examples | commands include `bunx`, best-effort `npx` caveat, and avoid shell-specific assumptions beyond Bun/npm invocation | docs snapshot |
| provenance support | missing unsupported provenance capability fails before publish | evidence fixture |
| npm dist-tag | prerelease uses non-`latest` dist-tag | tag fixture |

## Observability And Diagnostics

- Release summary includes selected tag, package version, source repo, npm dist-tag, dry-run/published status, SBOM/provenance artifact, U7 preflight result, publish validation result, and post-publish result.
- Every non-publish outcome states which guard blocked publish.
- Publish failure includes npm command phase and package/version, without token values.
- Post-publish failure includes failed check names and the published package/version.
- Docs consistency failure names stale file paths and expected command/package/runtime caveat text.

## Upstream Coverage

- `business-logic-model.md`: release workflow, inputs, tag selection, preflight policy, validation plan, publish guard, post-publish verification, and docs workflow define reliability outcomes.
- `business-rules.md`: trigger, tag/version, validation/publish, documentation, and release metadata rules define deterministic behavior.
- `requirements.md`: FR-015, FR-017, NFR-003, NFR-004, and NFR-005 define reliability acceptance.
- `technology-stack.md`: GitHub Actions and Bun/TypeScript baseline define execution environment.
