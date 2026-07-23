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

- 2026-07-23T02:55:58Z — [Deviations] §12a iter1 Critical1(U3→U1 辺が AD C-graph 外の新規依存)+Major2(共有マニフェスト衝突)を、マニフェスト機構の撤去=**重複不変量方式**(scripts/ と配布正本の同名資産同時実在禁止の generic assert)への設計変更で根治。承認済み AD components.md C1 の残置検査文言を申告付きで是正(是正マーカー+根拠を C1 本文に明記)— UG ゲートのユーザー承認をもって裁定とする(本 intent は選挙不実施・ユーザー直接裁定)。依存グラフは AD C-graph の純粋転写へ復帰(U3 独立化で並行性も向上)。
- 2026-07-23T02:55:58Z — [Interpretations] Minor3(U1 規模下限計算)は機械再計算(120+20=140 / 180+20=200)で是正。
