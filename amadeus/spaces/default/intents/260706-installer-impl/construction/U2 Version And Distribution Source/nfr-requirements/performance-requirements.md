# Performance Requirements — U2 Version And Distribution Source

> Stage: construction / nfr-requirements  
> Unit: U2 Version And Distribution Source  
> Upstream: `business-logic-model.md`, `business-rules.md`, `requirements.md`, `technology-stack.md`

## Scope

U2 の performance target は stable SemVer tag resolution、explicit version mapping、archive fetch/extract boundary、source metadata reading に限定する。`business-logic-model.md` が定義する通り、U2 は target detection、planning、apply、manifest write を実行しないため、target filesystem size は U2 performance の入力にしない。

## Targets

| Scenario | Target | Measurement |
|---|---:|---|
| SemVer tag filtering and ordering for 1,000 tags | p95 <= 50ms | unit benchmark with in-memory fake `TagSourcePort` |
| explicit bare version mapping among 1,000 tags | p95 <= 50ms | unit benchmark |
| metadata read for 2,000 distribution files | p95 <= 750ms | fixture benchmark on extracted temp tree |
| first-release fallback md5 generation for 2,000 files / 50MB total | p95 <= 3s on CI runner | U6 integration fixture |
| archive fetch retry accounting | exactly 2 fetch attempts max for transient failure | fake `ArchiveSourcePort` test |
| `loadDistribution` wrapper retry | 0 extra retries around `ArchiveSourcePort` | fake port call count |

Network wall-clock for real GitHub archive download is not a deterministic CI performance target. U2 uses mocked or fixture-backed ports for performance gates and treats real network latency as reliability/external dependency behavior.

## Measurement Protocol

All performance measurements run after `bun install --frozen-lockfile` using the Bun/TypeScript stack described in `technology-stack.md`. Unit benchmarks use fake ports and in-memory tag lists; integration benchmarks use local archive/extraction fixtures and do not reach real GitHub.

| Scenario | Samples | Warmup | Pass condition | Fail condition |
|---|---:|---:|---|---|
| tag filtering/order | 50 | first 5 discarded | p95 within target and selected tag correct | p95 over target or SemVer result incorrect |
| explicit version mapping | 50 | first 5 discarded | p95 within target and `v` preference correct | p95 over target or duplicate handling wrong |
| metadata read | 20 | first 3 discarded | p95 within target, every entry has `path/class/required/md5` | p95 over target or missing metadata field |
| fallback md5 generation | 10 | first 1 discarded | p95 within target and md5 stable across runs | p95 over target or nondeterministic md5 |
| retry accounting | 5 | none | call count exactly matches expected attempts | double retry or zero retry |

Functional correctness failures take precedence over performance classification.

## Resource Constraints

- Tag resolution must not load archives.
- Archive loading must extract only `dist/<harness>/`.
- Metadata fallback must walk only extracted distribution files.
- Temporary extraction directories must be cleanup-safe and not retained on successful runs.
- Any runtime dependency added for SemVer parsing, archive extraction, or md5 calculation must be justified under `requirements.md` NFR-005.

## Upstream Coverage

- `business-logic-model.md`: version resolution, archive loading, and metadata workflows define measured paths.
- `business-rules.md`: SemVer precedence, retry ownership, and metadata fallback rules define correctness gates.
- `requirements.md`: FR-007, FR-012, FR-013, NFR-001, and NFR-005 define performance constraints.
- `technology-stack.md`: Bun/TypeScript CI environment defines measurement baseline.
