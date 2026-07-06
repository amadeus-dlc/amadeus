<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-07-05T09:00:00Z — R006-2 を訂正した; code-generation のファクトチェックで amadeus-worktree.ts（独立 tool、WORKTREE_* emit）が実装済みと確認されたため、「意図的差分として記録」から「実装済みとして記録」へ変更。R006-1（gate evidence の結論）は不変。
- 2026-07-05T08:30:00Z — reviewer 指摘（iteration 1）を受けて R006 を追加した; #407 の判断項目 4（イベント契約の PR gate 要求水準 = BOLT_COMPLETED と PR merge を gate evidence とし fork/merge 整合はエンジンが保証）と項目 5（aidlc-worktree.ts 相当は amadeus-bolt.ts が担う意図的差分の記録）に明示的に答え、AC-1 に項目→R の対応を明記した。
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
