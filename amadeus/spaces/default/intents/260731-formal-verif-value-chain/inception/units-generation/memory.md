<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-31T10:25:34Z — C2+C3 を u4 に、C4+C5 を u5 に統合 — 片側だけでは出荷不可の境界(units-generation:c1 の統合則)。u8 は検証専用 Unit(Q1 ユーザー裁定)
- 2026-07-31T10:25:34Z — YAML edge block は parseBoltDag 実装(amadeus-lib.ts:7666、units/depends_on の fenced yaml)の様式を実測してから作成

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-31T10:30:58Z — reviewer Major を受け u1/u2 の AC 帰属を是正し、上流 requirements.md FR-A1/A5 へも申告付きで遡及同期(cite-fix-sweeps-whole-record の AC 面)。intent 終状態は不変

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
