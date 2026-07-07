# Performance Design — U2 Version And Distribution Source

> Stage: construction / nfr-design  
> Unit: U2 Version And Distribution Source  
> Upstream: `performance-requirements.md`, `security-requirements.md`, `scalability-requirements.md`, `reliability-requirements.md`, `tech-stack-decisions.md`, `business-logic-model.md`

## Design Summary

U2 performance is achieved by separating pure in-memory version resolution from external archive loading and local distribution metadata reading. Real GitHub network latency is excluded from deterministic performance gates; fake ports and local extraction fixtures measure the U2-owned work.

## Resolver Design

| Path | Design choice | Budget protected |
|---|---|---|
| default latest stable | normalize tag strings into SemVer records, group duplicate versions, sort semantically | p95 <= 50ms for 1,000 tags |
| explicit bare version | compute preferred `vX.Y.Z` and fallback `X.Y.Z` lookup by map | p95 <= 50ms for 1,000 tags |
| explicit v-prefixed tag | exact lookup without fallback | p95 <= 50ms class |
| prerelease explicit | allow only when exact or bare explicit mapping resolves | correctness first |

The resolver builds an in-memory tag index once per resolution request. It does not fetch archives or read target files.

## Archive And Metadata Budget Design

| Path | Design choice | Budget protected |
|---|---|---|
| archive fetch retry accounting | adapter-owned retry; fake port call count tests | exactly 2 attempts max |
| archive extraction | extract selected `dist/<harness>/` only | avoids full archive traversal beyond selected tree |
| metadata read | schema validate present metadata before use | p95 <= 750ms for 2,000 files |
| absent metadata fallback | walk extracted distribution tree and hash files | p95 <= 3s for 2,000 files / 50MB |

## Measurement Hook Design

U6 supplies:

- in-memory tag resolver benchmarks;
- fake `ArchiveSourcePort` retry accounting fixtures;
- local archive fixtures for selected harness extraction;
- metadata fixtures for valid, absent, invalid, and large distributions;
- md5 stability snapshots.

Functional correctness failures take precedence over timing, matching `performance-requirements.md`.

## Optimization Guardrails

- Do not introduce a persistent cache in first release.
- Do not fetch/extract all harnesses when one harness is selected.
- Do not inspect target project state to improve source-load performance.
- Do not perform retries outside `ArchiveSourcePort`.
- Do not add a SemVer/archive dependency without the NFR-005 rationale from `tech-stack-decisions.md`.

## Upstream Coverage

- `performance-requirements.md`: tag, explicit mapping, metadata, fallback md5, and retry targets drive this design.
- `security-requirements.md`: archive containment and metadata validation constrain performance shortcuts.
- `scalability-requirements.md`: tag/file capacity and no-cache stance define bounded processing.
- `reliability-requirements.md`: retry ownership and classified errors shape measurement classification.
- `tech-stack-decisions.md`: Bun/TypeScript, ports, extraction, metadata, and md5 decisions define implementation options.
- `business-logic-model.md`: default/explicit resolution, archive loading, and metadata workflows define U2 performance paths.

