<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-07-27T01:00:00Z — builder が narrow fix 適用後の実測で第2層の欠陥(reconcile-answer の非 consume: approve = executionAuthorization :278-279 の既存 manual auth 優先が prompt-approved を上書き / skip = skippedOutcome :374 の新規 operationId が reduceSkipForEvent :396-400 で invalid)を発見し逸脱停止 → ユーザー裁定 B(coordinator/reducer までスコープ拡張、guard は不変)。RE・クロスレビュー・requirements のいずれも「handlePromptAnswer 到達 = 解決」と暗黙仮定しており、到達後の consume 面は narrow fix の実測で初めて露出した
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
