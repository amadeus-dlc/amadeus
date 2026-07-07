# Performance Requirements — U4 Operation Planning And Safety

> Stage: construction / nfr-requirements  
> Unit: U4 Operation Planning And Safety  
> Upstream: `business-logic-model.md`, `business-rules.md`, `requirements.md`, `technology-stack.md`

## Scope

U4 performance covers pure planning over source metadata and target snapshot. It does not include archive fetch, target filesystem traversal, prompting, file copy, backup writes, manifest write, or verification.

## Targets

| Scenario | Target | Measurement |
|---|---:|---|
| clean install plan for 2,000 files | p95 <= 250ms | pure unit benchmark |
| manifest-installed upgrade plan for 2,000 files | p95 <= 350ms | pure unit benchmark |
| manual-or-unknown conservative plan for 2,000 files | p95 <= 350ms | pure unit benchmark |
| backup path generation for 500 changed shared files | p95 <= 100ms | pure unit benchmark with fake collision predicate |
| version-state no-write decision | p95 <= 20ms | unit benchmark |

These targets guard against accidental filesystem reads, heavy dependency imports, or quadratic planning behavior.

## Measurement Protocol

All benchmarks run under Bun/TypeScript on the CI baseline from `technology-stack.md`. Inputs are in-memory `DistributionFile[]`, `TargetDetection`, and `TargetSnapshot` fixtures. U4 benchmarks must not call real filesystem, network, prompt, reporter, applier, or manifest store.

| Scenario | Samples | Warmup | Pass condition | Fail condition |
|---|---:|---:|---|---|
| clean install | 50 | first 5 discarded | p95 within target and all absent files become `add` | p95 over target or wrong operation |
| manifest upgrade | 50 | first 5 discarded | p95 within target and md5 branches correct | p95 over target or unsafe operation |
| manual-or-unknown | 50 | first 5 discarded | p95 within target and unknown shared files backed up | p95 over target or missing backup |
| backup generation | 50 | first 5 discarded | p95 within target, timestamp shared, collision suffix correct | p95 over target or duplicate backup path |
| version no-write | 100 | first 10 discarded | p95 within target and reason correct | p95 over target or canApply incorrectly true |

Functional correctness failures take precedence over performance classification.

## Resource Constraints

- Planning must be O(n) or O(n log n) over source metadata/snapshot size.
- `backupPathExists` may be called only when a backup candidate exists.
- U4 must not recursively inspect target files.
- U4 must not perform md5 hashing; md5 comes from U2/U3.
- Runtime dependencies for planning should be avoided unless justified under dependency discipline.

## Upstream Coverage

- `business-logic-model.md`: install/upgrade planning and backup workflows define measured paths.
- `business-rules.md`: planning, force/yes, version, target state, and backup rules define correctness gates.
- `requirements.md`: FR-008, FR-009, FR-010, FR-011, NFR-002, NFR-003, and NFR-004 define performance constraints.
- `technology-stack.md`: Bun/TypeScript CI environment defines measurement baseline.
