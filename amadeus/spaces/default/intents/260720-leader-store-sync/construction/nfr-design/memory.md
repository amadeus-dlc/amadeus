<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

- [2026-07-20T05:32Z] Deviation: reviewer iteration 1 NOT-READY(Major 1 = S-4/SD-4 全単射崩れ・SD-4 の無申告新設 / Minor 1 = PD-1 の SC-1 無申告実装+SCD-1 重複)→ 案 (a) 採用(SD-4 格下げ+S-4 継承明示+PD-1/SCD-1 一本化)、iteration 2 READY(全単射・重複解消を実測閉包)。SD-4 の無申告新設は implementation-deviation-election クラスの設計段実例 — PM 回付申告。
- [2026-07-20T05:32Z] Interpretation: 層別保証(logical-components)の port 集合は AD mermaid エッジ4本と過不足なし(reviewer 照合)— AD iteration 2 で私が是正した集合定義が下流で正しく機能した対照。
