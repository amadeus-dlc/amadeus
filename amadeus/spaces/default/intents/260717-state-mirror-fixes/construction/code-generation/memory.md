<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-18T01:07:20Z — swarm prepare(batch 1、両 unit worktree fork)→ builder 2並行 fan-out(c2 隔離文言+deviation-stop+sync-completion を明記)。設計文書は main 未着地のためプロンプトへ内包(c2 の本線パス非混入を優先)
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-07-18T01:07:20Z — U1 builder が既存3テスト(t147/t149/t209、共有 fixture state-brownfield-feature.md)の旧バグ挙動 assert を検出し実装前停止 → E-SMF-CG1 ブロッカー選挙へ(deviation-stop-before-implement の模範実施)。U2 は逸脱なし完了(全 green・落ちる実証済み)
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
