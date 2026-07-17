<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-15T18:40:40Z — [U1] reviewer READY(Major 1: functional-design 側の verdict 証跡が成果物内に不在 → 一次記録は construction/functional-design/memory.md の Deviations(全4 unit の verdict・GoA・是正列)+leader へのゲート報告(agmsg 出典)であることを本エントリで明示し、成果物への Review 追記はしない方針(reviewer の書込み禁止指示と冪等性のため)/ Minor: TS-U1-3 の圧縮表現 → 原典因果を保つ表現へ是正済み)
- 2026-07-15T18:40:40Z — [U2-U4] レビューは1エージェントに per-unit 3独立 verdict を求めるバッチ方式(逸脱申告: 資源効率+U2-U4 が U1 NFR を継承する構造のため。iteration 予算は unit ごとに独立カウント。leader へゲート報告で明示)
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
