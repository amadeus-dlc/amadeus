<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
2026-07-30T21:04:50Z — §12a の directive 取得: 6 unit が並行 worktree で batch 実装されたため build 時の engine 解決 directive を捕捉しておらず、全 unit covered の現状では engine emit は裁定 B(E-OBB2-CG1)どおり fail-closed。conductor が実 unit 名で解決した directive を scope へ渡す(B&T §13 追補の退行条項該当だが、engine 欠陥ではなく batch 実装時の捕捉漏れという運用ギャップ — 次回は build 順に directive を保存する。恒久機構化の要否は §13 で諮る)。
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
