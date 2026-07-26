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

- 2026-07-25T10:29:00Z — Interpretations: 並列不可を「swarm resolve が U4 着地まで fail-closed」と時系列で確定し、直列7 Bolt とした。U2∥U3 の並列候補は U4 より前に位置するため本 intent では使えない
- 2026-07-25T10:29:00Z — Tradeoffs: U2/U3 は同位だが risk-first(Q1=A)で U2 先行。managed block 内容を capture 後の実機確定値で書ける副次効果も根拠
- 2026-07-25T10:29:00Z — Interpretations: 経済的質問は順序の1問のみ。ヒューリスティック(skeleton-first)と粒度(1Unit/Bolt)は team-practices/c1 で確定済みのため問わず
