<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-08T05:09:12Z — upstream PR #644 removed the root core/harness symlinks between scan and gate; folded the change into all 8 affected codekb files at the open gate (recovery protocol: new material revises the current stage, not a re-run) and recorded an addendum in reverse-engineering-timestamp.md
- 2026-07-08T04:16:18Z — ran diff-refresh from base bc9a6043 (per cid:reverse-engineering:c1) with Developer scan -> Architect synthesis serial subagents (c3); focus on distribution assets (c2). New codekb store landed at codekb/installer-distribution/ as resolved by codekb-path
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-07-08T04:16:18Z — codekb-path resolved the repo name to 'installer-distribution' (worktree dir basename) instead of 'amadeus' (prior store) — followed the tool verbatim per the stage file, but this looks like another worktree-session artifact in the #641 family; the space now holds two codekb stores for the same repo
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
- 2026-07-08T04:16:18Z — zero git tags exist: the GitHub tag-archive fetch premise requires establishing a tag convention within this intent (requirements scope decision); also decide extract-vs-reimplement for promote-self.ts ownership/diff logic (ADR at application-design)
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
