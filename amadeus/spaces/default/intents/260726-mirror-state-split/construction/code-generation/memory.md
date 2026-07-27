<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-07-26T15:15:00Z — builder が Step 1 着手前に第2の write⇔read 非対称(status の drift 比較が mirror.ts 自前 renderBody :210 を使用、実 Issue 本文は presentation.ts:185 renderMirrorIssueContent 生成)を発見し逸脱停止 → ユーザー裁定 B(同一レンダラへ寄せ・renderBody 重複定義削除可)で続行。deviation-stop-before-implement の実践成功例
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
