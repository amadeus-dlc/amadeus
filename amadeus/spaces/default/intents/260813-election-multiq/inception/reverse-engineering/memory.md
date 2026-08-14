<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-08-13T08:02:00Z — Issue #2813 の本質を CLI 表示ではなく、election から questions、voter responses、question results へ aggregate の cardinality を拡張する変更と解釈した。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

- 2026-08-13T08:02:00Z — 既存 store の一括破壊 migration より、旧形式 decoder と新 canonical writer を分ける方式が append-only 監査と後方読み取り要件に適合すると評価した。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

- 2026-08-13T08:02:00Z — 多問 schema、question ID、mixed result、global terminal condition、byte 互換範囲、最大問数と TLC state-space は後続要件・設計ステージで確定する。
