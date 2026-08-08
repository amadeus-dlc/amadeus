<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-08-07T12:05:00Z — §12a iteration 1 は NOT-READY(M3/m4/f2)→ 全数是正 → iteration 2 READY。主指摘は AC 被覆漏れ(FR-7 無検証・A-1 の出力契約化漏れ)と --json の無申告スコープ拡大 — 後者は FR から除外し OQ-3 として設計段の申告付き裁定へ委譲した。
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
- 2026-08-07T12:05:00Z — net≒実作業時間の妥当性検証をスコープ外に保つ代わりに、仮説である旨の出力明記を FR-6c として契約化(reviewer M-2 の裁定どおり、読み手への判断材料返却を製品要件に昇格)。
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
