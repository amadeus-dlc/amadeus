<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-08-07T15:19:10Z — §12a iteration 1 の verdict が未確立のまま前セッションが終了(reviewer subagent は 12:28:17Z に NOT-READY を返したが complete-review 未実行で Review block 不在、findings は audit truncate で喪失)。cid:functional-design:c3-pcp-reviewer-retry-on-lost-verdict に従い、resume 後に新 scope(invocationId 19c3eb7e-470a-4012-965f-79f43eb3d3b3)で iteration 1 を再ディスパッチした。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
