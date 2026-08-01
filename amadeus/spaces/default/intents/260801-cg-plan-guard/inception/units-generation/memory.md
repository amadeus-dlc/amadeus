<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
2026-08-01T10:50:00Z — 4 Unit 直列編成(U1 判定基盤→U2 発行側→U3 approve 突合→U4 docs)。直列の理由を dependency 成果物に記録し、本 intent 自身が導入するガードの「正当直列」corpus 実例となる自己適用を明記。edge block は shipped parseBoltDag の in-process 実測で ok(4バッチ・散文一致 — #1893 の教訓の自己適用)。採番 t398/t399/t400 予約。§12a iteration 1 READY(Minor 2 = advisory、AC-4a 分担と t398 交差注意を delivery-planning へ)。
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
