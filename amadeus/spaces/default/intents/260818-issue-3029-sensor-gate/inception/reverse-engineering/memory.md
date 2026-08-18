<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-08-18T09:20:00Z — Issue #3029 の患部は `amadeus-sensor.ts:772-778` の exit 127 分類と `amadeus-state.ts:2008-2014` の blocking pass predicate の接合部である。`spawn-failed` は branch 0 の別分岐として分離した。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

- 2026-08-18T09:20:00Z — RE では fail-closed / pass 維持を決めず、requirements に裁定を移した。これにより現行引用と両方の変更影響（t511 期待値反転または audit-format 整合）を保存した。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

- 2026-08-18T09:20:00Z — `tool-unavailable` を blocking sensor の失敗として扱うか、診断付き pass として維持するか。決定後に dispatcher、guard、t511/t92、sensor schema/audit-format の契約を同期する。
