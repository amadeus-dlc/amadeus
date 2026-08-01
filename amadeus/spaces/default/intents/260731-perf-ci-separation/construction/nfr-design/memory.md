<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-07-31T11:46:58Z — U4 nfr-design の reviewer 予算(2/2)消費後の残余是正: iteration 2 指摘(10% 許容幅 = NFR-1(ii) との無申告矛盾)を、要件文言の機械的復元(許容幅撤去+超過時帰属必須+ノイズ帰属の証拠条件)で conductor 是正。閉包の機械確認 = 1.10 乗数 0 hit / 帰属条項 present / センサー PASS。承認済み契約への一意復元(執行クラス)につき選挙不要、ゲートで開示
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
