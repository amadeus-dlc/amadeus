<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-08-03T07:53:03Z — 既存CodeKBを差分更新する; ユーザーは再利用選択で Modify を選択した。観測コミットは HEAD と origin/main が同じ `498c3034a78bd432dc426f9f807b79c8ae980762` であるため、Issue #2129 の advisory 発火・人間判断 receipt・latch・監査境界に焦点を絞る。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

- 2026-08-03T07:53:03Z — 全体再スキャンより患部の独立再実測を優先する; 共有CodeKBの全体像は維持しつつ、クロスレビューで確立した中核欠陥と未確定事項を分離して更新することで、Minimal depth に必要な鮮度と変更の局所性を両立する。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

- 2026-08-03T08:05:07Z — advisory固有の人間判断契約を要件化する; 選択の意味、stage body開始前のhold時点、receiptの相関・鮮度・失効、standing grant等との権限境界、protected writerをRequirements Analysisで確定する。
