<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-07T05:42:56Z — Treated GitHub issue #610 as a repository-architecture design intent, not an immediate code-move implementation; the acceptance criteria focus on layout alternatives, tradeoffs, path impact, and migration planning.
- 2026-07-07T05:42:56Z — Used Chat interaction mode for Intent Capture; the issue body and approval of the composer proposal provide enough context to answer the stage questions without a separate questionnaire round.

## Deviations
- 2026-07-07T05:42:56Z — `amadeus-log.ts answer` rejected the structured UI response because it did not detect a typed human turn; the mode choice is still recorded in the conversation and reflected in the questions artifact.

## Tradeoffs
- 2026-07-07T05:42:56Z — Chose a custom workflow scope over stock refactor; stock refactor is too thin for Issue 610 because it omits practices discovery, application design, units generation, and delivery planning needed for the requested impact inventory and migration plan.

## Open questions
- 2026-07-07T05:42:56Z — The final recommendation may still choose no migration; later stages must explicitly preserve that option and document why root-level `core/` and `harness/` should remain if that is the selected outcome.
