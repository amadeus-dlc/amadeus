<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-07-26T22:06:00Z — builder が FR-1 前提節の要求どおり noop 相関を実装前に実測し前提を反証(noop 空ウィンドウ ≈40ns・負荷非相関)→ 逸脱停止 → ユーザー再裁定 Q1改=C(median 基準、p95→median の契約変更を正準リスト(4)承認)。requirements を承認系譜つきで改訂(approval-lineage-citation)。§12a RA レビューは iteration 2/2 消費済みのため増分再レビューは実施できず、改訂は CG reviewer が実装レビュー時に requirements 改訂版と突き合わせる
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
