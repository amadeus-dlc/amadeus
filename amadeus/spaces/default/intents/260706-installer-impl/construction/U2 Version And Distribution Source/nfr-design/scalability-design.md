# Scalability Design — U2 Version And Distribution Source

> Stage: construction / nfr-design  
> Unit: U2 Version And Distribution Source  
> Upstream: `performance-requirements.md`, `security-requirements.md`, `scalability-requirements.md`, `reliability-requirements.md`, `tech-stack-decisions.md`, `business-logic-model.md`

## Design Summary

U2 remains a single-process source loader. Scalability design focuses on bounded tag processing, selected-harness extraction, distribution file inventory size, and independent temp directories for parallel invocations.

## Capacity Design

| Capacity surface | Design |
|---|---|
| tag list size | normalize and index at least 1,000 tags per request |
| duplicate groups | group by SemVer and prefer `v` tag deterministically |
| harness selection | extract exactly one selected harness tree |
| distribution file count | metadata/fallback supports at least 2,000 files |
| archive retry | at most 2 archive fetch attempts total |
| target project size | no dependency because target tree is not traversed |
| parallel invocations | independent temp dirs and no shared mutable cache |

## Growth Design

- A new harness requires enum, extraction, metadata, docs, and downstream planning fixtures.
- Larger archives can be handled by streaming/selected extraction later, but first design only requires selected-tree extraction.
- Authenticated/rate-limited GitHub access requires a separate token/secrets design.
- Offline/bundled cache is out of first release because cache invalidation changes source integrity.
- Metadata signatures/provenance documents require a separate schema/version design if introduced.

## Concurrency And Cleanup

- Retry state is local to one archive fetch call.
- Temp roots are unique per invocation and cleaned after successful source load.
- Cleanup failure is diagnostic and must not hide the primary source-load classification.
- No daemon, shared cache, or background worker is introduced.

## Upstream Coverage

- `performance-requirements.md`: tag/file benchmark targets define capacity floors.
- `security-requirements.md`: selected extraction and no target writes constrain scale mechanisms.
- `scalability-requirements.md`: capacity targets, scaling triggers, concurrency, and growth guardrails are implemented directly here.
- `reliability-requirements.md`: cleanup and retry behavior define safe scaling under failure.
- `tech-stack-decisions.md`: no persistent cache, port split, and temp API decisions define implementation posture.
- `business-logic-model.md`: workflows define which data grows and which downstream concerns remain outside U2.

