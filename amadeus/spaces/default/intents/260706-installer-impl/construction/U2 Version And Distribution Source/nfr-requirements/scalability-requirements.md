# Scalability Requirements — U2 Version And Distribution Source

> Stage: construction / nfr-requirements  
> Unit: U2 Version And Distribution Source  
> Upstream: `business-logic-model.md`, `business-rules.md`, `requirements.md`, `technology-stack.md`

## Scope

U2 is still a local single-process CLI capability, not a service. Scalability requirements therefore focus on bounded tag-list processing, distribution file inventory size, temp extraction size, and avoiding target-project-size coupling.

## Capacity Targets

| Dimension | Requirement |
|---|---|
| Tag list size | correct ordering and diagnostics for at least 1,000 tags |
| Duplicate version groups | deterministic `v` preference for all duplicate groups |
| Supported harnesses | exactly `claude`, `codex`, `kiro`, `kiro-ide` for extraction input |
| Distribution file count | metadata/fallback supports at least 2,000 files |
| Archive retry count | at most 2 archive fetch attempts total per source tag |
| Target project size | no dependency; U2 never traverses target files |
| Parallel invocations | independent temp dirs; no shared mutable cache required |

## Scaling Triggers

U2 design must be revisited if any of these become true:

- Installer needs offline/bundled distribution cache.
- Archive source becomes authenticated or rate-limited enough to require token handling.
- Distribution archives exceed fixture targets by an order of magnitude.
- Multiple harnesses are loaded in one invocation.
- Source metadata schema adds signatures or provenance documents that require separate verification.

## Concurrency Requirements

- Temp directories are per invocation.
- No global cache is required for first release.
- Retry state is per archive fetch request.
- Cleanup failure is reported as diagnostic but must not hide source-load failure classification.

## Growth Guardrails

- Adding a harness requires explicit enum, extraction fixture, metadata fixture, and docs update.
- Adding source metadata fields must preserve minimum `path`, `class`, `required`, `md5`.
- U2 does not scale by introducing background workers or daemons.
- Any cache proposal is out of scope for first release and needs separate design because cache invalidation can affect source integrity.

## Upstream Coverage

- `business-logic-model.md`: tag resolution and archive/metadata workflows define scaling dimensions.
- `business-rules.md`: supported harnesses, retry count, and metadata fields define capacity boundaries.
- `requirements.md`: FR-007, FR-012, FR-013, NFR-001, and NFR-005 define capacity constraints.
- `technology-stack.md`: local Bun process model informs concurrency and no-daemon stance.
