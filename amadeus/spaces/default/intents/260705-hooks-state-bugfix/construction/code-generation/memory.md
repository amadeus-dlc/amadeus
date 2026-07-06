<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-05T07:00:00Z — memory.md の配置は engine directive の memory_path（construction/code-generation/、unit セグメントなし）を正とした; reviewer は unit 配下を期待したが、260703 の実績と directive が一致するためこの位置を維持する。
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-07-05T07:00:00Z — builder の逸脱 2 件を採用した; (1) R001 を state-init の即時境界にも適用（AC-1 成立に必須、本 record が実例）、(2) AC-5 の実 fail は 3 件で全件解消（requirements の「2 件」は #464 起票時点の観測値）。amadeus-jump.ts の同型バグは後続 Issue 候補として報告する。
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
