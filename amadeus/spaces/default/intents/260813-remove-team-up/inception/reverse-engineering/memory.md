<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-13T13:59:00Z — This intent has no prior re-scan; differential base is the newest observed commit among other `re-scans/` that is an ancestor of HEAD with minimal distance: `854692fd7a11b124236b0427fe3d59e2fe6bf785` (count=34). Observed = worktree HEAD = `origin/main` lineage `97581b3e39187b13413c046e86f820d290a389eb`.
- 2026-08-13T13:59:00Z — Scan mode is a focused differential refresh on the `team-up.sh` retirement surface (Issue #2970 + user instruction to delete unused team-up.sh), not a full-repo rescan and not xrev-primary unless two cross-reviews already exist.

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-08-13T14:01:00Z — Stage prose requires Task(amadeus-developer-agent) then Task(amadeus-architect-agent). Opus and Sonnet Task dispatch both returned usage-limit errors; `inherit` is blocked by the #2438 preToolUse model pin. Conductor executed the scan+synthesis inline in this session rather than fabricating a Task result.

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
