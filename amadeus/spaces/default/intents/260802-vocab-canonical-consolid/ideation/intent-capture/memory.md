<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-08-02T09:52:30Z — 事前裁定済み事項(正本一本化・削除対象・供給制約)は質問化せず前提節として反映し、真に未決の3問(CONTEXT.md 存廃/slo-sli 用語表/投影粒度)のみ質問した; cid:intent-capture:c1 準拠
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-08-02T09:52:30Z — 初回 next が select-intent(既存96件)を返したが、ユーザーの新規 intent 指示が明示済みのため選択応答でなく next --new-intent 経路で birth した; 選択肢に「新規」が無い directive 形状への対応
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
