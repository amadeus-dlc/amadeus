# Practices Discovery Memory

## Interpretations

- 2026-07-07T06:24:50Z — Brownfield evidence was sufficient for the five practice areas; existing `amadeus/spaces/default/memory/team.md`, `project.md`, CodeKB, `package.json`, and CI config already cover work style, walking skeleton, testing, deployment, and code style.
- 2026-07-07T06:24:50Z — The stage prose mentions `.codex/amadeus-rules/`, but the active implementation promotes to `amadeus/spaces/default/memory/team.md` and `project.md`; the tool implementation in `amadeus-state.ts practices-promote` is treated as authoritative.
- 2026-07-07T06:24:50Z — User requested markdown content in Japanese; produced artifacts use Japanese prose while preserving required machine-readable section labels such as `## Way of Working`, `## Mandated`, and `ALWAYS` / `NEVER`.

## Deviations

- 2026-07-07T06:24:50Z — No separate interview question was asked before drafting because current brownfield evidence and already-affirmed team practices covered the requested practice areas; the affirmation gate remains the human checkpoint.

## Tradeoffs

- 2026-07-07T06:24:50Z — Practices are scoped to layout-normalization work instead of rewriting all existing team practices; this keeps promotion additive and avoids unrelated process churn.

## Open questions

- 2026-07-07T06:24:50Z — At the approval gate, confirm whether these layout-normalization practices should be promoted into shared memory or kept only as intent-local evidence.
