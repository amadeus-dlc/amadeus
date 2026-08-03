<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-08-02T03:56:13Z — 7 package面を全数「影響あり」と分類した; OpenCodeのようにstdin adapterを持たない面も共有CLI APIを実行するため対象であり、native lifecycleの欠測はunavailable capabilityとして判定済みにする。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

- 2026-08-02T03:56:13Z — audit-first eventをdurable正本に選んだ; foldコストを受け入れ、markdown stateまたは独立JSONとの二重正本を避け、projectionはreplay可能にする。
- 2026-08-02T03:56:13Z — moduleを4 Boltで段階抽出する; #1602で将来APIを先行実装せず、各後続Issueの最初の実利用時に共有contractを拡張する。
- 2026-08-02T04:03:19Z — canonical reserve writerをExecution Lifecycle Coordinatorへ一本化した; Policy/Pool/Interactionはpure decisionまたはtyped requestだけを作り、budget・attempt・slotを同じlock/event/receiptで確定する。
- 2026-08-02T04:03:19Z — Unit terminal failure後はdependency-aware continueを選んだ; local failureでは依存Unitを取消して独立Unitを続け、systemic failureでは新規dispatchを止める。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

- 2026-08-02T04:06:15Z — reviewer iteration budgetは2回で終了した; iteration 2の3件をその後に整合修正したが、protocol上3回目の独立reviewは行わないため、最新修正はsensorと整合scanのみの検証である。
