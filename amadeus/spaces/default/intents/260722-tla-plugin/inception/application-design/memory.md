<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-22T12:48:00Z — feasibility Q5(既成イメージ)の前提を設計段実測で不成立と確定し、ユーザーへ差し戻して再裁定(temurin公式+公式jar — ADR-5)。ruling-premise-closure の実践
- 2026-07-22T12:48:00Z — reviewer iteration 1 Critical: DarwinSandboxExecProvider を spawn 経路と誤引用(citation-semantics-check 違反の実例 — 実体は network-deny プローブ専用)。TlcSpawnPlanner 再設計+C-3b 計上+規模 150→300行再算定で是正、iteration 2 READY
- 2026-07-22T12:48:00Z — FR-3.5 の文言不整合(非ブロッキング)は requirements.md へ追補注記で即日解消

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
