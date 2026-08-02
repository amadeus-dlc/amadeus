<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-08-01T04:55:00Z — E-OMSND-S13 の conductor 提案 rationale に実測と乖離した数値2点(「6 unit × 13 sensor 全 PASSED」→ 実測は発火171/PASSED 170/FAILED 1(seq 625、resource-core questions の upstream-coverage、seq 627-630 で再発火 PASSED 閉包)。「U1 iteration1 Critical 2件」→ 実測 verdict は Critical 2+Major 2+Minor 1)を記載した — 両投票者が独立検出し留保付き採用。numbers-from-command-output-only / report-final-values-only の違反実例としてローリング PM へ記帳(裁定=0件は不変、本エントリが訂正転記)

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
