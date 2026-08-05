<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-05T07:34:13Z — 述語・台帳(検出)と CLI(配送)を単一 Unit(U2)へ統合: cid:units-generation:c1「片側だけでは利用者価値を出荷できない境界は単一 Unit へ統合」の適用。3 Unit 構成(U1∥U2 → U3)で並行度と統合点を両立
- 2026-08-05T07:34:13Z — unit kind は既習語彙(library/packaging)を使用。code-generation は produces_kinds を持たないため kind は completion 判定へ影響しない(FR-2c と整合、RE 実測済み)

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-08-05T07:40:33Z — §12a iteration 1 BLOCKER(2.7 は実装順序・critical path を語らない契約への違反 — U1 の walking-skeleton 言及と story-map の番号付き出荷順)を是正: 順序含意を除去し、walking-skeleton 該当性・実装順序の所有を 2.8 へ明示委譲。FOLLOW-UP 2件(C-5 の N/A 明示・規模導出の独自算出明記)と NIT(C10 非割当の独立注記)も同時是正

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
