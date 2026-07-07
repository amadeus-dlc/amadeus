# Scalability Requirements — U8 Manual Release And Docs

> Stage: construction / nfr-requirements  
> Unit: U8 Manual Release And Docs  
> Upstream: `business-logic-model.md`, `business-rules.md`, `requirements.md`, `technology-stack.md`

## Scope

U8 scalability covers growth in repository tags, release validation artifacts, package dry-run contents, docs references, SBOM/provenance artifact size, and release workflow runs. It does not cover multi-registry publishing, automated release trains, organization-wide rollout, or publishing multiple packages in one workflow.

## Capacity Targets

| Dimension | First-release target | Requirement |
|---|---:|---|
| tags scanned for default release | 1,000 | SemVer selection remains deterministic |
| package dry-run entries | 2,000 | allowlist and docs checks remain bounded |
| U7 preflight gates reused | 11 | all required gates report in release mode |
| release report artifacts | 20 | artifacts remain reviewable |
| docs files checked | 25 | installer command/package references remain consistent |
| npm metadata versions scanned | 500 | existing-version check remains bounded |
| release workflow frequency | manual, low volume | no auto-scale release queue required |

## Scaling Constraints

- U8 release workflow publishes only `@amadeus-dlc/setup`.
- Tag selection should stream or sort normalized SemVer records without relying on GitHub Release ordering.
- Release report artifacts should summarize large dry-run/SBOM details while preserving downloadable machine-readable evidence.
- Docs consistency checks should target installer docs and README surfaces rather than crawling unrelated generated artifacts.
- U8 must not expand PR-time gate scope; U7 owns PR gates, U8 owns release preflight reuse.

## Growth Triggers

| Trigger | Required response |
|---|---|
| tags exceed 1,000 | benchmark tag resolver and consider pagination/cache strategy |
| package dry-run entries exceed 2,000 | revisit package `files` allowlist and publish scope |
| docs surfaces exceed 25 files | define docs manifest for release consistency checks |
| multiple npm packages requested | separate release orchestration ADR required |
| release workflow exceeds 35 min excluding approval | split evidence generation and post-publish verification into clearer jobs without weakening blockers |

## Release Matrix Strategy

- First release uses one release workflow for the package and one selected tag.
- OS matrix is not required for publish itself; U7/U6 portability evidence can run in preflight if CI design adds targeted jobs.
- Release environment approval is a single protected gate, not per validation step.
- Dry-run and publish modes share validation paths so dry-run remains a faithful rehearsal.

## Upstream Coverage

- `business-logic-model.md`: workflow inputs, tag selection, release validation plan, and docs workflow define scalability surfaces.
- `business-rules.md`: trigger, tag/version, validation, and docs rules define scaling constraints.
- `requirements.md`: FR-015, FR-017, NFR-004, and NFR-005 define scalable release/docs validation needs.
- `technology-stack.md`: GitHub Actions, Bun/TypeScript, and package structure define execution constraints.

