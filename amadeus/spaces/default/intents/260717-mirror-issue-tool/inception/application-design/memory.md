<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-17T14:20:53Z — 質問0問(O-R1/O-R2 は設計裁量)をユーザー承認のうえ ADR-2/ADR-3 で確定; reviewer READY(iteration 1)+ Minor 指摘(Reversibility 欄欠落)をゲート前に是正(全5 ADR へ1行追加、review 後の非機能的追記)。
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
- 2026-07-17T14:20:53Z — amadeus-lib import 再利用(ADR-5) vs 最小自前実装 → import 採用; scripts→core import の repo 内前例(scripts/package.ts:53)を reviewer が独立確認。
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
