<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-13T15:20:00Z — engine `produces` の `build-test-results.md` を正とし、stage 本文の `test-results.md` 名は使わない。
- 2026-08-13T15:20:00Z — Comprehensive でも性能・セキュリティ NFR が無いので専用試験は適用外と明示する。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-08-13T15:20:00Z — Step 11 の `amadeus-state.md` 直接更新は行わない。遷移は orchestrate `report` が所有する。
- 2026-08-13T15:20:00Z — `bun run test:ci` 全件は走らせず、FR/NFR に結びつく 4 ファイル + typecheck/lint/build を本ステージの証拠にする。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-08-13T15:20:00Z — absence テストの glob を空配列のままにせず、置換ファイル自身を残件 allowlist にする。自己一致で永久赤になるため。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
