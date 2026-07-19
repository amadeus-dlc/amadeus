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

- [2026-07-19T23:20Z] Interpretation: per-unit FD(U1 単独)— AD component-methods.md を型の正本とし逐語継承(cross-unit-type-verbatim-check は単一 Unit につき対象間参照なし)。BR-6 に E-GMECG 追補(fix コミット後切替+SHA 明示復元)を反映。
- [2026-07-19T23:20Z] Interpretation: frontend-components.md は N/A 根拠つきで CLI 出力契約に充当(UI 不在 — SKIP された mockups 系の補完はしない)。

- [2026-07-19T23:28Z] Deviation: reviewer iteration 1 = NOT-READY(Major #1: AD services.md の出力表記誤記(appendBallot failed:)と FD の無申告乖離 — storeFail 実装様式の実測で FD 側が正 / Major #2: FR-4(c) classifyLate・late lane の FD 未確定 / minor: Mermaid ラベルの生アングルブラケット)。是正: AD 側誤記を遡及修正+FD に整合節、BR-4b 新設(AD 逐語継承+late 分岐のフロー反映)、ラベル和文化。AD 遡及編集の自動発火は stage-mismatch 偽赤になりうるため自ステージ手動再発火で確定(manual-sensor 追補4)。

- [2026-07-19T23:35Z] Interpretation: iteration 2 = READY(3所見の閉包を実コード照合で確認、退行なし)。AD 遡及是正(services.md 誤記)も両成果物一致で確定。
