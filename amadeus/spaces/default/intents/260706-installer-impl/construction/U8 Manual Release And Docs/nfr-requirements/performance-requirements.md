# Performance Requirements — U8 Manual Release And Docs

> Stage: construction / nfr-requirements  
> Unit: U8 Manual Release And Docs  
> Upstream: `business-logic-model.md`, `business-rules.md`, `requirements.md`, `technology-stack.md`

## Scope

U8 performance covers manually triggered release workflow validation, tag selection, U7 preflight reuse, package build/dry-run, SBOM/provenance generation, publish validation, npm publish execution, post-publish verification, and docs consistency checks. It does not cover ordinary PR gate execution except as reused release preflight, and it does not make publish automatic on push, merge, or tag push.

## Targets

| Scenario | Target | Measurement |
|---|---:|---|
| workflow input validation | p95 <= 30s | GitHub Actions step timing |
| latest stable SemVer tag selection over 1,000 tags | p95 <= 30s | release script timing |
| release U7 preflight aggregate | p95 <= 20 min | GitHub Actions workflow timing |
| package build plus dry-run | p95 <= 5 min | GitHub Actions check timing |
| SBOM/provenance evidence generation | p95 <= 5 min | GitHub Actions check timing |
| publish validation against npm metadata | p95 <= 2 min | GitHub Actions check timing |
| dry-run release workflow without publish | p95 <= 30 min | GitHub Actions workflow timing |
| publish workflow through npm publish attempt | p95 <= 35 min excluding protected approval wait | GitHub Actions workflow timing |
| post-publish verification | p95 <= 5 min | GitHub Actions check timing |
| docs consistency check | p95 <= 2 min | GitHub Actions check timing |

Protected environment approval wait is human-controlled and excluded from workflow performance targets.

## Measurement Protocol

Measurements run in GitHub Actions with Bun/TypeScript on the baseline described in `technology-stack.md`. U7 preflight gates use the U7 command contracts; release-specific steps write reports under `.amadeus-ci/setup/`.

| Scenario | Samples | Warmup | Pass condition | Fail condition |
|---|---:|---:|---|---|
| tag selection | 20 fixture samples | none | p95 within target and canonical v-prefixed duplicate chosen | wrong tag or timeout |
| dry-run workflow | 5 release dry-run samples | none | p95 within target and no publish command invoked | timeout or publish attempted |
| publish validation | 10 fixture samples | none | p95 within target and existing npm version blocks publish | timeout or missed conflict |
| evidence generation | 5 CI samples | none | p95 within target and SBOM/provenance artifact exists | missing artifact or timeout |
| docs consistency | 20 fixture samples | none | p95 within target and package/bin/command references match | missed stale docs |

Correct non-publish behavior and publish guard classification take precedence over speed.

## Resource Constraints

- U8 release workflow must not run on ordinary push, pull request, or tag push.
- U7 preflight is required unconditionally in release context and must not use `installerRelated:false` to skip gates.
- `dry_run:true` must avoid npm publish and npm credential use where possible.
- Package build/dry-run, SBOM/provenance, publish-validation, and post-publish reports must remain bounded CI artifacts.
- Publish must run at most once per workflow execution and must not hide failure behind retry loops.

## Upstream Coverage

- `business-logic-model.md`: release workflow, tag selection, release preflight, validation plan, publish guard, post-publish verification, and docs workflow define measured paths.
- `business-rules.md`: trigger, tag/version, validation/publish, documentation, and release metadata rules define correctness gates.
- `requirements.md`: FR-015, FR-017, NFR-003, and NFR-005 define release/docs performance expectations.
- `technology-stack.md`: GitHub Actions, Bun/TypeScript, and package layout define execution baseline.

