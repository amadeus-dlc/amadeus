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
- 2026-07-19T22:48:05Z [Interpretation] E-TCRRA1〜4 全て A 採用(blind、各 3-0)。留保7件を [Answer]+FR-1/3/4 へ verbatim 転記(Q1 の3留保は「GoA4 棄権票の choice を勝者母集団から除外」に収斂 — 個別文も保存)。
- 2026-07-19T22:54:31Z [Deviation] reviewer = 条件付き READY(GoA 3)。M1: t234 の tally 消費「7箇所」誤記(実測 8箇所/9呼び出し)— ledger-count-mechanical-recalc 違反実例、RE record の一次誤りごと是正(自分でも grep 再実測して転記)。m1〜m4(consumes 残3点の N/A 明記・code-structure :427 verbatim 化・FR-3 表示形式の明示委譲・GoA tie 分岐の FD 申し送り)も適用。
