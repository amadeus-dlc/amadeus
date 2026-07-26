<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

- 2026-07-25T08:05:00Z — Interpretations: 質問は2問に限定したが、両問とも「既存の流儀に合わせよ」というユーザー修正で確定。導出可能事項を質問しない教訓を再確認(二度目)
- 2026-07-25T08:05:00Z — Tradeoffs: FR は Must M1-M10 と1対1対応 + 契約系(FR-3b の既存流儀、FR-4 の編集点)を file:line で接地。NFR-3 は c4 の将来条件チェックリスト様式
