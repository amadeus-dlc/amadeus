# Performance Requirements — U3 Target State And Manifest

> Stage: construction / nfr-requirements  
> Unit: U3 Target State And Manifest  
> Upstream: `business-logic-model.md`, `business-rules.md`, `requirements.md`, `technology-stack.md`

## Scope

U3 performance covers manifest read/validation, sentinel classification, and target snapshot over expected files. U3 does not resolve versions, fetch archives, plan operations, write manifest, or apply target changes.

## Targets

| Scenario | Target | Measurement |
|---|---:|---|
| valid manifest read and validation with 2,000 file entries | p95 <= 150ms | fixture benchmark |
| sentinel detection for one selected harness | p95 <= 100ms | fake filesystem unit benchmark |
| no-manifest all-harness inference | p95 <= 200ms | fake filesystem benchmark over sentinel sets |
| snapshot of 2,000 expected files / 50MB total md5 reads | p95 <= 3s on CI runner | U6 temp target fixture |
| unreadable md5 fallback handling | p95 <= 500ms for 100 unreadable files | fake filesystem benchmark |

These targets are quality gates for accidental broad filesystem traversal. They are not user-facing SLA guarantees.

## Measurement Protocol

All measurements use Bun/TypeScript on the CI baseline from `technology-stack.md`. Filesystem benchmarks use temp target fixtures and fake filesystem ports; they must not mutate the target.

| Scenario | Samples | Warmup | Pass condition | Fail condition |
|---|---:|---:|---|---|
| manifest validation | 30 | first 5 discarded | p95 within target and classification correct | p95 over target or schema result wrong |
| sentinel detection | 30 | first 5 discarded | p95 within target and state correct | p95 over target or wrong state |
| harness inference | 30 | first 5 discarded | p95 within target and ambiguity correct | p95 over target or wrong prompt/no-write behavior |
| snapshot md5 | 10 | first 1 discarded | p95 within target and every expected file represented | p95 over target or missing snapshot row |
| unreadable md5 | 10 | first 1 discarded | p95 within target, `exists:true`, md5 omitted | p95 over target or thrown fatal error |

Functional correctness failures take precedence over performance classification.

## Resource Constraints

- `detectTarget` may inspect only manifest path and harness sentinel paths.
- `snapshotTarget` may inspect only expected files from metadata/manifest context.
- U3 must not recursively scan the entire target project.
- U3 must not perform target writes, backups, or manifest writes.
- Any runtime dependency added for schema validation or hashing must be justified under dependency discipline.

## Upstream Coverage

- `business-logic-model.md`: detection and snapshot workflows define measured paths.
- `business-rules.md`: manifest, sentinel, classification, and snapshot rules define correctness gates.
- `requirements.md`: FR-006, FR-011, FR-013, NFR-002, NFR-003, and NFR-004 define performance constraints.
- `technology-stack.md`: Bun/TypeScript CI environment defines measurement baseline.
