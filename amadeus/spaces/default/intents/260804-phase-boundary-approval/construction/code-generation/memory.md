<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-08-05T02:00:00Z — reviewer FOLLOW-UP ① ruled in the plan: duplicate `record` for the same advisory-instance returns the stored receipt (idempotent); a duplicate with a DIFFERENT choice is refused loudly — a refusal on same-choice retries would re-create #2232's re-entry burden.
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-08-05T02:00:00Z — NFR-3 deviation: the FR-2 wording-contract test lands in tests/integration/ with `// size: medium` (not unit as the requirement stated) because it reads real SKILL.md files via node:fs and the size-drift gate caps unit at small; precedent t368-phase-check-name-contract. Approval requested at the gate.
- 2026-08-05T02:00:00Z — no-silent-drop ledger rebind deliberately NOT performed inside the Bolt (a ledger write is an audited operation); reproduced as base-side (detached checkout of b938898f3 fails identically). Conductor performs the rebind at PR time, as in #2192/#2224.
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
- 2026-08-05T02:00:00Z — S1's Red run surfaced an unreported gap: pi's SKILL.md lists only 8 directive kinds and omits `await-advisory-choice` entirely. FR-5e now adds the bullet, but no machine check compares each harness SKILL.md's directive list against the engine's emitted kinds — follow-up issue candidate.
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
