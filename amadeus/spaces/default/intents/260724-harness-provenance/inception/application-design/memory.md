<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-24T12:48:44Z — 新規コンポーネント追加せず既存amadeus-lib.ts/amadeus-utility.tsへの最小追加で設計(ADR-4)。manual上書きはAMADEUS_HARNESS_TYPE env override(ADR-2、既存AMADEUS_HARNESS_DIR規約に倣う)、docs反映もconstruction scopeに含める
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-07-24T12:48:44Z — architecture-reviewer iteration1でNOT-READY(harnessDir/deriveHarnessDir取り違えでAC-3b不成立、HarnessType型6値とFR-1 7値の矛盾)→是正(harnessDir()経由へ統一、型を7値manual含むへ拡張)→iteration2でREADY
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
