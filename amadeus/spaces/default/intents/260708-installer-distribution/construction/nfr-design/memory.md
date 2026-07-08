<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-08T09:59:33Z — U2 nfr-design iteration 1: 4 findings applied — Applier/Verifier port-split supersession notes added in U2 functional-design (the U1 lesson applied at introduction time), verifier I/O structure section added covering the third budget row, HarnessName.parse placement reconciled ('cli' = the U2 unit, smart-constructor pattern in domain/), fail-fast singleton note added
- 2026-07-08T09:15:02Z — U1 nfr-design iteration 1: 6 findings applied. Core fix: REL-F01's blanket 'no write API' claim was self-contradictory with manifest-io — replaced by a two-tier guarantee (resolver=no write / fetcher=TmpWrite-only branded port / manifest-io=legitimate single-file writer protected by call-order contract). createManifestIo port split declared as a formal supersession of component-methods (note added upstream); domain->internal value-import + internal->domain type-only import discipline stated (no runtime cycle); SIGINT/SIGTERM handlers added to tmp cleanup; SafePath homed as fetcher-local branded type; tech-stack references added everywhere
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-07-08T09:52:13Z — U1 nfr-design iteration 2 (redispatched after a stalled reviewer): one residual — the fix itself changed createFetcher's signature without the supersession note that the parallel createManifestIo change received; applied as builder resolution. Same lesson family as nfr-requirements:c5 (fix-induced divergences need the full supersession treatment at the moment they are introduced)
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
