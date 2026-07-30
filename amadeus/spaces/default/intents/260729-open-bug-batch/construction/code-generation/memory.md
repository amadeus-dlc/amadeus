<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-30T04:35:00Z — treated the already-reserved path of `gate-reserve` as in-scope for FR-1680-2; returning the existing `presence_reservation_id` to a non-main caller discloses the approval capability, so it is an "engine mutation" boundary even though no state write occurs on that path

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-30T04:55:00Z — dispatched the §12a reviewer via the built-in `explore` subagent (custom profile `amadeus-architecture-reviewer-agent` was not discoverable in this session). First dispatch received the Stop-hook forwarding-loop injection and self-approved the gate (live FR-1680-1 repro on this unpatched worktree); repaired via unpark + backward jump. Second dispatch carried an explicit injection-warning preamble and stayed read-only. Rule of thumb: on worktrees without the #1680 fix, every subagent prompt must warn that Stop-hook loop injections do not apply to it
- 2026-07-30T04:58:00Z — fresh READY review (invocation 198b1bd7-9831-4dba-b1b0-c39f786e811c) could not be appended by the reviewer runtime: the unit's iteration budget (2) was already exhausted by development-time reviews whose last recorded verdict (NOT-READY) predates the Revision 2/3 implementation. Proceeded per protocol ("iterations exhausted → proceed to gate") and surfaced the fresh review at the gate instead

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-30T04:35:00Z — guarded `handleGateReject` as well as `handleGateReserve`; FR-1680-2 names only next/report/park/state mutation, but reservation marker files are disk-readable by the reviewer role (Read/Grep/Glob), so an unguarded gate-reject would let a subagent reject a gate with a read-off carrier. Leader approved this wider option B

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
