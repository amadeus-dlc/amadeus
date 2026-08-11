<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-08-10T11:00:00Z — Unit 境界は single-unit(kind: service)で裁定(decide-question)。scope-document の B1/B2 proto-Unit は ADR-1(detect-ci-changes 無改修)により B2 の分離スライスが消滅し、単一 Unit へ縮退 — cid:code-generation:c6 の「先行裁定が交差を消した場合のスコープ縮小」と同型。edge block は nested 形+kind 必須(c2-edgeblock-nested-kind-required)。
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
