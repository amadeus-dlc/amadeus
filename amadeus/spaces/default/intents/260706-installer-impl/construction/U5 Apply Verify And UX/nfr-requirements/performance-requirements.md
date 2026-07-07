# Performance Requirements — U5 Apply Verify And UX

> Stage: construction / nfr-requirements  
> Unit: U5 Apply Verify And UX  
> Upstream: `business-logic-model.md`, `business-rules.md`, `requirements.md`, `technology-stack.md`

## Scope

U5 performance covers plan rendering, prompt dispatch, ordered file apply, atomic manifest write, post-apply verification, and final report rendering. It does not include GitHub tag/archive network time, archive extraction, target-state detection, or planning policy computation.

## Targets

| Scenario | Target | Measurement |
|---|---:|---|
| render plan for 2,000 operations | p95 <= 150ms | reporter snapshot benchmark |
| apply 2,000 add/update operations totaling 50 MiB | p95 <= 20s | temp directory integration benchmark |
| back up and replace 500 shared files totaling 25 MiB | p95 <= 20s | temp directory integration benchmark |
| atomic manifest write with 2,000 file entries | p95 <= 250ms | temp directory benchmark |
| verification over 2,000 manifest entries | p95 <= 750ms | temp directory benchmark |
| classified no-write report | p95 <= 50ms | reporter unit benchmark |

These targets keep normal cached/local install work well inside `requirements.md` NFR-001 while leaving external GitHub network variance to U2.

## Measurement Protocol

Benchmarks run under Bun/TypeScript on the CI baseline described in `technology-stack.md`. File apply and verification use temporary local fixtures; no benchmark may call the real GitHub network or mutate a developer workspace.

| Scenario | Samples | Warmup | Pass condition | Fail condition |
|---|---:|---:|---|---|
| plan render | 50 | first 5 discarded | p95 within target and stable columns `Operation`, `Files`, `Example` | slow render or missing columns |
| apply add/update | 10 | first 1 discarded | p95 within target and copied file count matches plan | slow apply, out-of-order apply, or missing file |
| backup replace | 10 | first 1 discarded | p95 within target and every dependent copy occurs after backup | slow apply or missing backup |
| manifest write | 50 | first 5 discarded | p95 within target and valid JSON is atomically visible | partial manifest or slow write |
| verification | 50 | first 5 discarded | p95 within target and failed checks are named | slow verification or opaque failure |
| no-write report | 100 | first 10 discarded | p95 within target and no mutation port called | slow report or mutation call |

Functional correctness failures take precedence over performance classification.

## Resource Constraints

- U5 must execute operations in plan order without global rescans.
- File apply should stream or use Bun filesystem primitives without loading large copied files into application-level strings.
- Reporter output generation must be linear in operation count.
- Verification must read required entries from the manifest and check existence; it must not hash all target files.
- Manifest write uses a temp file in the manifest directory followed by rename.

## Upstream Coverage

- `business-logic-model.md`: apply, manifest, verification, reporter, and prompt workflows define measured paths.
- `business-rules.md`: apply ordering, manifest gating, prompt suppression, and reporter invariants define correctness gates.
- `requirements.md`: FR-008, FR-009, FR-010, FR-011, FR-013, FR-014, NFR-001, NFR-002, NFR-003, NFR-004, and NFR-006 define performance-relevant behavior.
- `technology-stack.md`: Bun/TypeScript CI environment defines measurement baseline.

