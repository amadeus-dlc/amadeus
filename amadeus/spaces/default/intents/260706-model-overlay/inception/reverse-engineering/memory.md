<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-06T05:35:00Z — churn 中（2.2.0 同期 + rename CI 中）のため codekb は据え置き採用とし、対象 seam（agent 定義 / promote-skill / parity 機構）は eng1/issue-526-rename の read-only 参照で rename 後の姿を直接調査した（順序制約の指示どおり）
- 2026-07-06T05:35:00Z — 重要な設計含意を検出: engine の .agents/amadeus/agents/ は promote-skill の書き込み対象外（skills → .agents/skills のみ）。overlay の適用点は「promote-skill 後段」だけでは engine agents に届かず、上流同期後に単独実行できる適用スクリプト（例: apply-model-overrides）が必要。requirements へ引き継ぐ

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
