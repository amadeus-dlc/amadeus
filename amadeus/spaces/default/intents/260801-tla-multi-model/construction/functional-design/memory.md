<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-01T21:50:00Z — §12a reviewer を per-unit で実施(5並列→u2/u3 は iteration 2 で READY、他は iteration 1 READY)。u2 Major(呼出側矛盾)は期間限定 shim で設計解決

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-08-01T21:50:00Z — complete-review 記録時に bash 連想配列の失敗で u5 の review block が全 unit に誤記録される事故があった。全 artifact から誤ブロックを除去し unit ごとの正しい値で再記録済み(本記録時点で検証済み)

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-08-01T21:50:00Z — なし

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-08-01T21:50:00Z — u5 の advisory 3件(D-U5-4 追加所有の code-summary 記録義務、D-U5-5 skeleton fail-closed の明示承認、story-map 誤記の他 unit 波及)は code-generation で閉じる
