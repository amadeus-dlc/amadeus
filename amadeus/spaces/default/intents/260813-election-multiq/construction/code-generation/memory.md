<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-14T06:20:00Z — U6 is brownfield: existing migrate script and t262/t556 already implement plan/approve/apply/verify; code-generation closes contract gaps rather than rewriting the CLI.
- 2026-08-14T06:40:00Z — U7 is brownfield: FormalElection already models I1–I8; rebase onto origin/main left live identities complete, so code-generation adds identity characterization and established/held-only mutant evidence instead of rewriting the spec.
- 2026-08-14T07:12:46Z — U8 skill must stay a 4-section forwarder; v2 hold with a named verb is hold-only rerun distribution, not automatic human escalation.

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-08-14T06:20:00Z — skipped the per-unit plan-approval question because the engine emitted gate:false for this unit under Construction Autonomy Mode gated; the orchestrator suppresses per-unit human gates and §13 until the all-units re-entry.

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-08-14T06:30:00Z — Claude opus/sonnet hit usage limits, so U6 implementation and the architecture review ran in the conductor session against the reviewer pass-list; complete-review still minted the durable READY verdict.
- 2026-08-14T07:12:46Z — U8 architecture review also ran in the conductor session against the reviewer pass-list; complete-review minted READY for invocation 4cd48498-9b73-41c6-8927-2db3ec99efed.
- 2026-08-14T06:30:00Z — chose characterization tests for the already-working v2 dual-read path instead of forcing a Red implementation, because FR-COMP-4 was missing evidence rather than behavior.
- 2026-08-14T06:46:00Z — rebased onto origin/main before U7; kept both main's later intents/elections and this branch's election-multiq / attestation records.
- 2026-08-14T06:46:00Z — U7 kept FormalElection source and model-map unchanged after identity recomputation; added live pin and REAL TLC mutants instead of a no-op identity rewrite.
- 2026-08-14T07:12:46Z — U8 added explicit-v2 peek-and-forward on the published CLI token instead of retargeting the skill to `amadeus-election-v2-cli.ts`, so t242 FR-2b and legacy `--result` loops stay intact.
- 2026-08-14T07:27:00Z — rebase brought #2999 Delivery Bolt attestation. runtime-graph was stale (no delivery_bolts). compile restored the carrier. code-generation reports stay local-evidence; the format sensor now accepts that shape only at `--stage code-generation`.

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
