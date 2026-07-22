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
- 2026-07-22T21:56:42Z — Interpretations: 質問空間は全て既裁定・既実測のため 0 問様式(E-OC1 の post 様式)を採用。scope-document を完了定義の言う「整理成果物」の正本と位置付けた
- 2026-07-22T21:56:42Z — Tradeoffs: 順序付けは dependency-first 一択(直列依存)のため選好裁定を省略。WSJF/RICE のスコアリングは proto-Unit 5件・依存直列の規模では過剰と判断し MoSCoW のみ使用
- 2026-07-22T21:56:42Z — Open questions: PU-5(intents.json への createdAt 明示)の要否は実装 intent の設計判断へ委譲
