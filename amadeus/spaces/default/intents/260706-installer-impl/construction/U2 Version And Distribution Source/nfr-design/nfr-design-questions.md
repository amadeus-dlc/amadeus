# NFR Design Questions — U2 Version And Distribution Source

> Stage: construction / nfr-design  
> Unit: U2 Version And Distribution Source  
> Upstream: `performance-requirements.md`, `security-requirements.md`, `scalability-requirements.md`, `reliability-requirements.md`, `tech-stack-decisions.md`, `business-logic-model.md`

## Decision

U2 では追加の NFR design 質問を実施しない。

[Answer]: No additional questions. U2 NFR design decisions are fully determined by approved NFR requirements and functional design artifacts.

## Rationale

- `performance-requirements.md` が SemVer resolver、explicit version mapping、metadata read、fallback md5、retry accounting の測定条件を固定している。
- `security-requirements.md` が canonical repo、encoded tag URL、archive path containment、metadata schema validation、no target write を固定している。
- `scalability-requirements.md` が 1,000 tags、2,000 distribution files、per-invocation temp dirs、no cache stance を固定している。
- `reliability-requirements.md` が classified source-load errors、exactly one archive retry、cleanup diagnostics、portability invariants を固定している。
- `tech-stack-decisions.md` と `business-logic-model.md` が TagSourcePort / ArchiveSourcePort / ArchiveExtractorPort / metadata reader split を固定している。

## Design Decisions Already Fixed

| Question | Answer |
|---|---|
| Should GitHub Release metadata drive latest ordering? | No. It is supplemental only. |
| Should `loadDistribution` retry around `ArchiveSourcePort`? | No. Retry is owned exactly once by the port/adapter. |
| Should invalid present metadata fall back to path policy? | No. It fails hard as `distribution-metadata-invalid`. |
| Should U2 touch target project files? | No. U2 only loads source distribution data. |
| Should U2 add a persistent distribution cache? | No. First release uses per-invocation temp extraction only. |

## Ambiguity Analysis

- Vague answers: none. The only answer is explicit no-additional-questions.
- Contradictions: none. NFR requirements and functional design agree on retry ownership, metadata fallback, canonical repository, and no-target-write behavior.
- Missing details blocking artifact generation: none. Resolver, archive adapter, extractor, metadata reader, temp cleanup, and diagnostics boundaries are fixed by upstream artifacts.

