<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-08T08:59:35Z — U5 NFR iteration 1: reviewer traced t68 to its actual read path (dist/claude copy) and caught that U5 — the only unit touching packages/framework/core — omitted the core->dist regeneration obligation. REL-D01 completion condition now t68 AND dist:check/promote:self:check (complementary mechanisms); workflow gained the regeneration step; tech-stack and change-target table aligned
- 2026-07-08T08:23:24Z — U2 NFR iteration 1: 2 findings — fixture E2E threshold corrected to 31s (U1 local-I/O 6s + U2 25s) with the measured interval (process start-to-exit) made explicit; Node floor unified to 18.3 with U1 tech-stack as the single authoritative statement (parseArgs 18.3.0) and engines.node/README bound to it
- 2026-07-08T08:08:44Z — U1 NFR reviewer iteration 1: 7 findings applied. High-value catches: Windows NTFS colon problem in backup filenames (solved with dual representation — Plan.startedAtIso extended for manifest, backupTimestamp basic token for filenames, propagated to U2/U3 meta construction) and the budget arithmetic contradiction (timeouts now derive the budget: normal 31s / worst-retry 66s with NFR-001 asserting the normal path only). md5 attribution corrected to plan-time (U1 workflow-3 aligned); hardlink rejection added; upstream refs and memory verification added
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-07-08T08:33:23Z — U3 NFR iteration 1: SEC-U01's 'exclusion' sentence was vacuous (walk iterates payload side; .bk can never enter the plan) — rewritten as a design fact with the apply-time collision check as the only needed guard; verification lines added to all three SEC-U items matching the U1/U2 pattern
- 2026-07-08T08:14:23Z — U1 NFR iteration 2 (final): one residual propagation miss in U1's own canonical type file (installedAt/installStartedAt '同一値' comments) fixed as builder resolution. The persisted grep rule was applied to downstream units but missed the ORIGIN unit's own file — grep must include the unit being fixed, not only its consumers
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
