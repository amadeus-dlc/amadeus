<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
2026-07-20T03:06:25Z — Synthesis confirms Developer root cause with zero citation discrepancy: the ❌ branch is invariably recordPrefix===null, driven by activeIntent(pd)===null. The true variable axis is pd resolution — resolveProjectDir (amadeus-lib.ts:211-235) ranks CLAUDE_PROJECT_DIR env (②) above script-path (③), so a session whose env points at a cursor-unresolved tree (e.g. main checkout) silently skips the diary. This intent's own diary auto-generated (921B template, live ✅ probe) precisely because engineer-1's session env resolved the cursor correctly — the same code that failed on tally/ballot issuances. The defect is a design one: the diary chokepoint (:1172) carries no explicit intent anchor, unlike audit/report (--intent selector), so it alone is fragile to ambient-cursor drift.
2026-07-20T03:06:25Z — codekb body 8 artifacts preserved (churn avoidance, c1): this is a behavioral/environment-dependent defect on a chokepoint that is structurally stable across the interval (git log 37f8cf5e6..HEAD on the two focus files = 0). No structure/API/dependency/tech-stack change to record.

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
2026-07-20T03:06:25Z — For requirements/election: the 5 fix candidates (loud skip / null-as-error+re-resolve / explicit intent anchor on diary path / pd-resolution reorder / cursor-lifecycle hardening incl. #1258) are not mutually exclusive — they split into (i) a detection contract that distinguishes legitimate pre-birth skip from bug skip, and (ii) a resolution mechanism that guarantees the write. Candidate (c) explicit intent anchor is the structural fix that also collapses the audit/diary asymmetry; (a) loud skip is a cheap detection improvement compatible with any of (b)/(c)/(e); (d) pd-reorder is high-blast-radius and should stand alone. This orthogonality (detection vs guarantee vs observability) is the precise point to put to election.
2026-07-20T03:06:25Z — Residual unknown that cannot be recovered by git (flagged, not fabricated): the exact CLAUDE_PROJECT_DIR/cwd/cursor values at each past ❌ next were gitignored + unlogged and worktree-checkout mtime forensics is invalid. Requirements should therefore define the invariant ("when the intent exists, the diary is generated regardless of pd/cursor state") and require a falling-proof test that injects the reproduction condition (multi-intent + cursor-unresolved pd) at the integration layer, rather than asserting a specific historical env value.
