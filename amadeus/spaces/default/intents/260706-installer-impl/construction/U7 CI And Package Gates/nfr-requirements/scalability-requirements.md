# Scalability Requirements — U7 CI And Package Gates

> Stage: construction / nfr-requirements  
> Unit: U7 CI And Package Gates  
> Upstream: `business-logic-model.md`, `business-rules.md`, `requirements.md`, `technology-stack.md`

## Scope

U7 scalability covers growth in changed files, gate count, coverage registry entries, dependency findings, secret findings, package contents, and CI artifacts for installer-related PRs. It does not cover release fan-out, multi-registry publishing, or organization-wide CI policy rollout.

## Capacity Targets

| Dimension | First-release target | Requirement |
|---|---:|---|
| changed files per PR | 1,000 | classifier remains under performance target |
| installer gates | 11 | all required gates report independently |
| coverage registry entries | 100 | freshness/ratchet remains under performance target |
| dependency findings | 1,000 | normalized security gate remains bounded |
| secret findings | 1,000 | verified-secret evaluation remains bounded |
| package dry-run file entries | 2,000 | allowlist evaluation remains bounded |
| CI artifacts under `.amadeus-ci/setup/` | 20 | artifact upload remains reviewable |

## Scaling Constraints

- Gate definitions must be data-driven enough to add a future gate without rewriting classifier logic.
- Classifier path patterns must remain explicit and reviewable.
- Security gates evaluate normalized findings linearly by finding count.
- Coverage registry and ratchet checks evaluate mapped keys rather than scanning unrelated repository files.
- Report artifacts should summarize large finding sets while preserving machine-readable detail.

## Growth Triggers

| Trigger | Required response |
|---|---|
| full installer PR workflow exceeds 20 min p95 | split long checks into parallel jobs or scheduled non-blocking extensions while preserving FR-016 blockers |
| dependency findings exceed 1,000 | add pagination/chunked report handling to normalized schema |
| coverage registry exceeds 100 mappings | add grouped summary and baseline metadata |
| installer gates exceed 11 | introduce explicit gate registry with dependencies and path conditions |
| package dry-run entries exceed 2,000 | revisit package `files` allowlist and publish content scope |

## CI Matrix Strategy

- First release should avoid broad OS matrix for every installer-related PR unless portability failures demand it.
- Portability-sensitive tests from U6 can run on the primary CI OS with path API fixtures.
- If Windows shell compatibility becomes a repeated failure mode, add targeted matrix jobs for smoke/portability only.
- Release workflow preflight in U8 may reuse U7 gates but must not expand U7 PR scope to publish concerns.

## Upstream Coverage

- `business-logic-model.md`: GatePlan, Concrete Gate Execution Contract, and report artifacts define scalability surfaces.
- `business-rules.md`: gate, security, coverage, drift, and reporting rules define scaling constraints.
- `requirements.md`: FR-016, NFR-004, and NFR-005 define scalable CI validation needs.
- `technology-stack.md`: existing GitHub Actions and Bun setup define CI execution constraints.

