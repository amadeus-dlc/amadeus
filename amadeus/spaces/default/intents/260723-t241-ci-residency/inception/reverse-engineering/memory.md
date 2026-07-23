<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-23T01:10:53Z — 差分ベースは自 intent 前回 scan の observed `a81c11dde`(祖先 exit 0、distance 35)を採用(cid:rescan-base-ancestry)。本バグ面の base..HEAD diff は 0 — 欠陥は #1235(260718-election-ts-foundation)由来でドリフトなし
- 2026-07-23T01:10:53Z — 原因所在 = 実装逸脱: ADR-6(decisions.md:44)は layer(i) を「integration テストで固定する」と明記(verbatim 裏取り済み)、実装が tests/e2e/ に配置し --ci 範囲(run-tests.ts:197-202、e2e 非含有)との整合検証を欠いた(cid:bug-intent-linkage)
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-07-23T01:10:53Z — RE センサー3種は cid:re-sensors-codekb-filter-mismatch により構造不適合 → conductor 手動確認で代替: produces 9+re-scan 実在 ls 全数 OK、t241:1 / run-tests.ts:197-202 / decisions.md:44 の verbatim 裏取り一致
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
